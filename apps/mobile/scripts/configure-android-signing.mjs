#!/usr/bin/env node
/**
 * Configure release signing for the generated Android project.
 *
 * Run AFTER `npx expo prebuild -p android` and BEFORE Gradle.
 *
 * Three supported modes:
 *  1. Production keystore supplied as base64 in ANDROID_KEYSTORE_BASE64
 *     (+ ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, optional ANDROID_KEY_PASSWORD)
 *     → release builds are signed with the real upload key.
 *  2. Keystore already on disk (ANDROID_KEYSTORE_PATH, e.g. for local builds)
 *     → same as (1).
 *  3. No keystore at all → the stock Expo config stays in place: release builds
 *     are signed with the bundled debug keystore, which is installable for QA
 *     but rejected by the Play Store. Nothing fails, nothing is invented.
 *
 * Secrets are only ever read from the environment; no password, alias or
 * keystore byte is written into the repository (android/ is git-ignored and the
 * generated keystore.properties lives inside it).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const androidDir = path.join(projectRoot, "android");
const gradlePath = path.join(androidDir, "app", "build.gradle");
const propsPath = path.join(androidDir, "keystore.properties");

function log(message) {
  console.log(`[signing] ${message}`);
}

if (!existsSync(gradlePath)) {
  console.error("[signing] android/app/build.gradle not found — run `npx expo prebuild -p android` first.");
  process.exit(1);
}

/* ------------------------------------------------------------ keystore (1) */
const base64 = process.env.ANDROID_KEYSTORE_BASE64?.trim();
let keystorePath = process.env.ANDROID_KEYSTORE_PATH?.trim() || "";
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD || process.env.ANDROID_KEYSTORE_PASSWORD;

if (base64) {
  const decoded = path.join(androidDir, "release.keystore");
  writeFileSync(decoded, Buffer.from(base64, "base64"));
  keystorePath = decoded;
  log(`decoded keystore from ANDROID_KEYSTORE_BASE64 (${Buffer.from(base64, "base64").length} bytes)`);
}

const hasKeystore = Boolean(keystorePath) && existsSync(keystorePath);

if (!hasKeystore) {
  log("no keystore supplied → release builds will be signed with the debug keystore (QA / sideload only).");
  log("set ANDROID_KEYSTORE_BASE64 + ANDROID_KEYSTORE_PASSWORD + ANDROID_KEY_ALIAS for Play-signed builds.");
  // Make sure we never leave a stale signing config behind from a previous run.
  if (existsSync(propsPath)) writeFileSync(propsPath, "");
  process.exit(0);
}

if (!storePassword || !keyAlias) {
  console.error("[signing] keystore present but ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS are missing.");
  process.exit(1);
}

writeFileSync(
  propsPath,
  [
    `storeFile=${keystorePath}`,
    `storePassword=${storePassword}`,
    `keyAlias=${keyAlias}`,
    `keyPassword=${keyPassword ?? storePassword}`,
  ].join("\n") + "\n",
  { mode: 0o600 },
);

/* ------------------------------------------------------------- gradle patch */
let gradle = readFileSync(gradlePath, "utf8");

if (!gradle.includes("keystorePropertiesFile")) {
  // 1. Load keystore.properties (only when it exists) before the android block.
  gradle = gradle.replace(
    /^android\s*\{/m,
    `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
def hasReleaseKeystore = false
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
    hasReleaseKeystore = keystoreProperties["storeFile"] != null &&
        new File(keystoreProperties["storeFile"].toString()).exists()
}

android {`,
  );

  // 2. Declare a release signing config inside the signingConfigs block,
  //    right after the debug config (structure of the block is preserved).
  const releaseConfig = [
    "",
    "        release {",
    "            if (hasReleaseKeystore) {",
    '                storeFile file(keystoreProperties["storeFile"])',
    '                storePassword keystoreProperties["storePassword"]',
    '                keyAlias keystoreProperties["keyAlias"]',
    '                keyPassword keystoreProperties["keyPassword"]',
    "            }",
    "        }",
  ].join("\n");
  gradle = gradle.replace(
    /(\n\s*debug\s*\{[^}]*\n\s*\})/,
    (_match, debugBlock) => `${debugBlock}\n${releaseConfig}`,
  );

  // 3. Release build type: real key when available, debug key otherwise.
  gradle = gradle.replace(
    /(release\s*\{(?:[^{}]|\{[^{}]*\})*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug",
  );

  writeFileSync(gradlePath, gradle);
}

const patched = readFileSync(gradlePath, "utf8");
if (!patched.includes("hasReleaseKeystore ? signingConfigs.release")) {
  console.error("[signing] failed to patch build.gradle — the Expo template changed. Patch manually.");
  process.exit(1);
}

log(`release signing configured with alias "${keyAlias}".`);
