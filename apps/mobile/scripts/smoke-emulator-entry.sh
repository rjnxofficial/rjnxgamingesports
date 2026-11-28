#!/bin/sh
# Entry point for reactivecircus/android-emulator-runner.
#
# That action executes its `script:` input with /usr/bin/sh (dash), which does
# not understand `set -o pipefail` and exits 2 before running anything. Keep this
# wrapper POSIX-only and hand the real work to bash.
set -eu

echo "::notice title=rjnx smoke::emulator up - starting checks"
adb devices || true

APK=$(find /tmp/rjnx-apk -type f -name '*.apk' 2>/dev/null | head -1)
if [ -z "${APK:-}" ]; then
  echo "::error title=rjnx smoke::no APK found in the downloaded artifact"
  find /tmp/rjnx-apk -type f 2>/dev/null | head -20 || true
  exit 1
fi

ls -lh "$APK" || true
echo "testing $APK"
exec bash apps/mobile/scripts/smoke-android-apk.sh "$APK"
