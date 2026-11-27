#!/usr/bin/env bash
# Installs the freshly built release APK on an emulator, cold-starts it and
# asserts that the JS bundle reached the UI. Any crash is reproduced from logcat
# and printed in full so the workflow annotation / PR comment carries the real
# FATAL EXCEPTION instead of "build passed but app closes".
#
# Usage: smoke-android-apk.sh <path-to-apk> [package-id]
set -uo pipefail

APK="${1:?usage: smoke-android-apk.sh <apk> [package]}"
PACKAGE="${2:-com.devkazzu.rjnxgamingesports}"
RESULT_DIR="${RESULT_DIR:-/tmp/rjnx-smoke}"
mkdir -p "$RESULT_DIR"
LOG="$RESULT_DIR/logcat.txt"
REPORT="$RESULT_DIR/report.txt"

section() { printf '\n===== %s =====\n' "$1"; }

section "waiting for emulator"
adb wait-for-device
for _ in $(seq 1 120); do
  booted=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  [ "$booted" = "1" ] && break
  sleep 2
done
echo "sys.boot_completed=$(adb shell getprop sys.boot_completed | tr -d '\r')"
adb shell input keyevent 82 || true
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

section "install"
if ! adb install -r -t "$APK" 2>&1 | tee -a "$REPORT"; then
  echo "FAILED: apk could not be installed"; exit 3
fi
adb shell pm list packages | grep -F "$PACKAGE" || { echo "FAILED: package not installed"; exit 3; }

MODE="${SMOKE_MODE:-configured}"
echo "SMOKE_MODE=$MODE" >> "$REPORT"

section "launch (cold start)"
adb logcat -c || true
adb shell am force-stop "$PACKAGE" || true
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >> "$REPORT" 2>&1
sleep 25

section "collect logcat"
adb logcat -d -v time > "$LOG" 2>/dev/null || true
echo "logcat lines: $(wc -l < "$LOG")" >> "$REPORT"

section "process state"
PID=$(adb shell pidof "$PACKAGE" | tr -d '\r')
echo "pid=${PID:-none}" >> "$REPORT"
if [ -z "$PID" ]; then
  echo "FAILED: process is not running (startup crash)" | tee -a "$REPORT"
  STATUS=1
else
  STATUS=0
fi

section "JS boot markers"
grep -E "RJNXStartup|ReactNativeJS" "$LOG" | tail -60 | tee -a "$REPORT" || true

section "fatals"
FATALS=$(grep -E "FATAL EXCEPTION|AndroidRuntime: (java|android|com)\." "$LOG" | head -80)
if [ -n "$FATALS" ]; then
  echo "$FATALS" | tee -a "$REPORT"
  echo "FAILED: native/Java fatal exception detected" | tee -a "$REPORT"
  STATUS=1
fi

if grep -q "ui-ready" "$LOG"; then
  echo "PASS: JS reached ui-ready" | tee -a "$REPORT"
elif [ "$MODE" = "configured" ]; then
  echo "FAILED: JS never reported ui-ready" | tee -a "$REPORT"
  STATUS=1
else
  echo "NOTE: ui-ready not observed (expected for the unconfigured build)" | tee -a "$REPORT"
fi

if [ "$MODE" != "configured" ] && grep -q "CONFIGURATION ERROR\|config" "$LOG"; then
  echo "PASS: unconfigured build rendered its configuration error screen" | tee -a "$REPORT"
fi

section "ui dump (current screen)"
adb shell uiautomator dump /sdcard/rjnx-ui.xml > /dev/null 2>&1 && \
  adb shell cat /sdcard/rjnx-ui.xml 2>/dev/null | tr '>' '>\n' | grep -oE 'text="[^"]+"' | head -30 | tee -a "$REPORT"

section "result"
if [ "$STATUS" -eq 0 ]; then echo "SMOKE TEST PASSED"; else echo "SMOKE TEST FAILED"; fi
exit "$STATUS"
