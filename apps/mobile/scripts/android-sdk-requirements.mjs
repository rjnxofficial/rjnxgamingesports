#!/usr/bin/env node
/**
 * Single source of truth for the Android SDK packages this app needs.
 *
 * Expo wires the Gradle version catalog (`expoLibs`) to
 * `node_modules/react-native/gradle/libs.versions.toml`, which declares
 * compileSdk / buildTools / ndkVersion. The generated `android/build.gradle`
 * does not contain those numbers, so CI cannot grep for them — this script
 * resolves them the same way Gradle does and prints sdkmanager package IDs.
 *
 * Usage:
 *   node scripts/android-sdk-requirements.mjs                 # human summary
 *   node scripts/android-sdk-requirements.mjs --print-packages # one id per line
 *   node scripts/android-sdk-requirements.mjs --json
 *   node scripts/android-sdk-requirements.mjs --check         # verify installed SDK
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(projectRoot, "../..");
const args = new Set(process.argv.slice(2));

function findCatalog() {
  const candidates = [
    path.join(repoRoot, "node_modules/react-native/gradle/libs.versions.toml"),
    path.join(projectRoot, "node_modules/react-native/gradle/libs.versions.toml"),
  ];
  return candidates.find((file) => existsSync(file)) ?? null;
}

function readTomlVersions(files) {
  const versions = {};
  for (const file of files.filter((file) => file && existsSync(file))) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = /^\s*([A-Za-z0-9_]+)\s*=\s*"([^"]+)"\s*$/.exec(line);
      if (match) versions[match[1]] ??= match[2];
    }
  }
  return versions;
}

const catalog = findCatalog();
const versions = readTomlVersions([
  catalog,
  path.join(projectRoot, "android/gradle/libs.versions.toml"),
]);

// gradle.properties can override the catalog via android.compileSdkVersion etc.
const gradleProperties = existsSync(path.join(projectRoot, "android/gradle.properties"))
  ? readFileSync(path.join(projectRoot, "android/gradle.properties"), "utf8")
  : "";
const property = (key, fallback) =>
  new RegExp(`^${key}=(.+)$`, "m").exec(gradleProperties)?.[1]?.trim() ?? fallback;

const compileSdk = Number(property("android.compileSdkVersion", versions.compileSdk ?? "36"));
const targetSdk = Number(property("android.targetSdkVersion", versions.targetSdk ?? compileSdk));
const minSdk = Number(property("android.minSdkVersion", versions.minSdk ?? "24"));
const buildTools = property("android.buildToolsVersion", versions.buildTools ?? "35.0.0");
const ndk = versions.ndkVersion ?? "27.1.12297006";

const packages = [
  "platform-tools",
  `platforms;android-${compileSdk}`,
  `build-tools;${buildTools}`,
  `ndk;${ndk}`,
];

if (args.has("--print-packages")) {
  console.log(packages.join("\n"));
  process.exit(0);
}

const info = {
  catalog: catalog ? path.relative(repoRoot, catalog) : "(defaults)",
  compileSdk,
  targetSdk,
  minSdk,
  buildTools,
  ndkVersion: ndk,
  packages,
};

if (args.has("--json")) {
  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
}

if (args.has("--check")) {
  const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  if (!sdkRoot) {
    console.error("✗ ANDROID_SDK_ROOT / ANDROID_HOME are not set");
    process.exit(1);
  }
  let installed = "";
  try {
    installed = execFileSync(process.env.SDKMANAGER || "sdkmanager", ["--list_installed"], {
      encoding: "utf8",
    });
  } catch (error) {
    console.error(`✗ ${process.env.SDKMANAGER || "sdkmanager"} failed: ${error.message}`);
    process.exit(1);
  }
  const missing = packages.filter(
    (pkg) => !installed.split("\n").some((line) => line.trim().startsWith(`${pkg} `)),
  );
  if (missing.length) {
    console.error(`✗ missing Android SDK packages:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`✓ all Android SDK packages installed (${packages.join(", ")})`);
  process.exit(0);
}

console.log(`SDK requirement source: ${info.catalog}`);
console.log(`  compileSdk : ${compileSdk}`);
console.log(`  targetSdk  : ${targetSdk}`);
console.log(`  minSdk     : ${minSdk}`);
console.log(`  buildTools : ${buildTools}`);
console.log(`  ndk        : ${ndk}`);
console.log("required sdkmanager packages:");
for (const pkg of packages) console.log(`  - ${pkg}`);
