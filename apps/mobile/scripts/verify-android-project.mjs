#!/usr/bin/env node
/**
 * Verifies the generated Android project *without* needing a JDK.
 *
 * Gradle needs a JDK + the Android SDK, which are not always available (local
 * sandboxes, docs machines). This script statically checks everything that
 * usually breaks an Expo prebuild in a monorepo: applicationId, versionCode,
 * minSdk/targetSdk wiring, permissions, keystore file, signing configuration,
 * bundled assets and the Gradle wrapper. It runs in CI *before* Gradle so a
 * configuration error fails fast with a readable message.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const androidDir = path.join(projectRoot, "android");
const appGradle = path.join(androidDir, "app", "build.gradle");
const rootGradle = path.join(androidDir, "build.gradle");
const manifest = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
const appJson = JSON.parse(readFileSync(path.join(projectRoot, "app.json"), "utf8")).expo;

const failures = [];
const notes = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [label, file] of [
  ["android/", androidDir],
  ["android/app/build.gradle", appGradle],
  ["android/build.gradle", rootGradle],
  ["AndroidManifest.xml", manifest],
]) {
  check(existsSync(file), `missing ${label} — run \`npx expo prebuild -p android\``);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const gradle = readFileSync(appGradle, "utf8");
const manifestText = readFileSync(manifest, "utf8");
const packageName = appJson.android.package;

check(
  gradle.includes(`applicationId '${packageName}'`) || gradle.includes(`applicationId "${packageName}"`),
  `applicationId in build.gradle does not match app.json (${packageName})`,
);
check(gradle.includes(`namespace '${packageName}'`), `namespace does not match ${packageName}`);
check(
  new RegExp(`versionCode\\s+${appJson.android.versionCode}`).test(gradle),
  `versionCode does not match app.json (${appJson.android.versionCode})`,
);
check(gradle.includes('signingConfigs {'), "no signingConfigs block");
check(gradle.includes("signingConfigs.debug"), "release build type is not signed at all");

// signing wiring: either the stock debug fallback or our patched conditional
const patched = gradle.includes("hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug");
check(
  patched || /release\s*\{[^}]*signingConfig signingConfigs\.debug/s.test(gradle),
  "release build type has no signingConfig",
);
notes.push(patched ? "release signing: patched (production key when configured)" : "release signing: stock debug fallback");

check(existsSync(path.join(androidDir, "gradle", "wrapper", "gradle-wrapper.properties")), "gradle wrapper missing");
check(
  /distributionUrl=.*gradle-\d+\.\d+/.test(readFileSync(path.join(androidDir, "gradle", "wrapper", "gradle-wrapper.properties"), "utf8")),
  "gradle wrapper distributionUrl is malformed",
);
check(existsSync(path.join(androidDir, "gradlew")), "gradlew missing");

// SDK levels come from the Expo-managed version catalog; make sure the project
// actually inherits them instead of silently using stale defaults.
const sdk = JSON.parse(
  execFileSync(process.execPath, [path.join(projectRoot, "scripts/android-sdk-requirements.mjs"), "--json"], {
    encoding: "utf8",
  }),
);
notes.push(`sdk: compile ${sdk.compileSdk} / target ${sdk.targetSdk} / min ${sdk.minSdk}, build-tools ${sdk.buildTools}, ndk ${sdk.ndkVersion}`);
const gradleProperties = readFileSync(path.join(androidDir, "gradle.properties"), "utf8");
check(
  !/^android\.compileSdkVersion=/m.test(gradleProperties) || gradleProperties.includes(`android.compileSdkVersion=${sdk.compileSdk}`),
  "gradle.properties pins a compileSdkVersion that differs from the SDK requirements",
);

check(manifestText.includes('android:allowBackup'), "manifest looks incomplete");
for (const permission of appJson.android.permissions ?? []) {
  if (permission === "INTERNET") continue; // always injected by the template
  check(
    manifestText.includes(`android.permission.${permission}`),
    `manifest is missing android.permission.${permission}`,
  );
}

const fontDir = path.join(androidDir, "app", "src", "main", "assets", "fonts");
const fontsExpected = appJson.plugins?.some?.(
  (plugin) => typeof plugin === "string" && plugin.includes("with-brand-fonts"),
);
if (fontsExpected) {
  check(existsSync(fontDir), "brand-fonts plugin did not copy fonts into android assets");
  if (existsSync(fontDir)) {
    const ttf = readFileSync(path.join(fontDir, "Orbitron_700Bold.ttf"), { flag: "r" });
    check(ttf.length > 0, "bundled font is empty");
    notes.push(`bundled fonts: ${existsSync(fontDir) ? "present" : "missing"}`);
  }
}

const keystoreProps = path.join(androidDir, "keystore.properties");
if (existsSync(keystoreProps) && readFileSync(keystoreProps, "utf8").trim()) {
  const props = readFileSync(keystoreProps, "utf8");
  const storeFile = /storeFile=(.+)/.exec(props)?.[1]?.trim();
  check(Boolean(storeFile && existsSync(storeFile)), `keystore.properties points to a missing file: ${storeFile}`);
  notes.push("keystore: configured");
} else {
  notes.push("keystore: none (debug-signed release)");
}

// Keystores embedded in the project must never be committed; only the Expo
// debug keystore is allowed inside the generated project.
const debugKeystore = path.join(androidDir, "app", "debug.keystore");
check(existsSync(debugKeystore), "android/app/debug.keystore missing (needed for debug/fallback signing)");
notes.push(`debug keystore: ${statSync(debugKeystore).size} bytes`);

if (failures.length) {
  console.error("\n✗ Android project verification failed:");
  for (const message of failures) console.error(`  • ${message}`);
  process.exit(1);
}

console.log("✓ Android project verified");
for (const note of notes) console.log(`  · ${note}`);
