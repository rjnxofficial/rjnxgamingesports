#!/usr/bin/env node
/**
 * Injects a real release signing config into the generated Android project.
 *
 * Run this AFTER `npx expo prebuild -p android` and BEFORE Gradle. It reads the
 * keystore details from the environment (never from the repo) so no signing
 * material is ever committed:
 *
 *   ANDROID_KEYSTORE_PATH      path to the .jks file (already decoded)
 *   ANDROID_KEYSTORE_PASSWORD  keystore password
 *   ANDROID_KEY_ALIAS          key alias
 *   ANDROID_KEY_PASSWORD       key password (defaults to keystore password)
 *
 * With no keystore configured the script exits 0 and leaves the stock Expo
 * config (release builds are then signed with the debug key — installable for
 * testing, but NOT acceptable for Play upload).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const gradlePath = path.join(projectRoot, "android/app/build.gradle");
const propsPath = path.join(projectRoot, "android/keystore.properties");

const keystore = process.env.ANDROID_KEYSTORE_PATH;
const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPassword = process.env.ANDROID_KEY_PASSWORD || process.env.ANDROID_KEYSTORE_PASSWORD;

if (!existsSync(gradlePath)) {
  console.error("[signing] android/app/build.gradle not found — run `npx expo prebuild -p android` first.");
  process.exit(1);
}

if (!keystore || !storePassword || !keyAlias) {
  console.log("[signing] No keystore secrets found — leaving the default (debug) signing config in place.");
  process.exit(0);
}

if (!existsSync(keystore)) {
  console.error(`[signing] Keystore file not found at ${keystore}`);
  process.exit(1);
}

writeFileSync(
  propsPath,
  [
    `storeFile=${path.isAbsolute(keystore) ? keystore : path.join(projectRoot, keystore)}`,
    `storePassword=${storePassword}`,
    `keyAlias=${keyAlias}`,
    `keyPassword=${keyPassword}`,
  ].join("\n") + "\n",
);

let gradle = readFileSync(gradlePath, "utf8");

if (!gradle.includes("keystore.properties")) {
  // 1. Load the properties file before the android block.
  gradle = gradle.replace(
    /^android\s*\{/m,
    `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {`,
  );

  // 2. Declare a release signing config next to the debug one.
  const releaseBlock = [
    "        release {",
    "            if (keystorePropertiesFile.exists()) {",
    '                storeFile file(keystoreProperties["storeFile"])',
    '                storePassword keystoreProperties["storePassword"]',
    '                keyAlias keystoreProperties["keyAlias"]',
    '                keyPassword keystoreProperties["keyPassword"]',
    "            }",
    "        }",
    "    }",
    "",
  ].join("\n");
  gradle = gradle.replace(
    /(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*)\s*\}/,
    (_match, head) => `${head}\n${releaseBlock}\n}`,
  );

  // 3. Point the release build type at it (leave the debug build type alone).
  gradle = gradle.replace(
    /(release\s*\{(?:[^{}]|\{[^{}]*\})*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug",
  );

  writeFileSync(gradlePath, gradle);
}

if (!readFileSync(gradlePath, "utf8").includes("keystorePropertiesFile.exists() ? signingConfigs.release")) {
  console.error("[signing] Failed to patch build.gradle — expo template changed. Patch manually.");
  process.exit(1);
}

console.log(`[signing] Release signing configured with alias "${keyAlias}".`);
