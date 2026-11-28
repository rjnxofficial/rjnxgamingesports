#!/usr/bin/env node
/**
 * Guards the crash class that shipped in the first APK:
 *
 *   Incompatible React versions: react 19.1.10 vs react-native-renderer 19.1.0
 *   TypeError: Cannot read property 'ErrorBoundary' of undefined
 *
 * React Native compiles its own renderer against a specific React version. If a
 * different React copy is resolved (typical in a monorepo where the root hoists
 * the web workspace's React), expo-router's first render throws and the release
 * app dies right after the splash screen.
 *
 * The check compares the version Metro would resolve from apps/mobile with the
 * version baked into react-native's renderer.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(projectRoot, "../..");

const resolveVersion = (pkg, cwd) =>
  execFileSync(process.execPath, ["-p", `require("${pkg}/package.json").version`], {
    cwd,
    encoding: "utf8",
  }).trim();

const rendererFile = path.join(
  repoRoot,
  "node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-prod.js",
);

let rendererVersion = null;
try {
  rendererVersion = /19\.\d+\.\d+/.exec(readFileSync(rendererFile, "utf8"))?.[0] ?? null;
} catch {
  console.error("✗ cannot read the react-native renderer — is react-native installed?");
  process.exit(1);
}

const mobileReact = resolveVersion("react", projectRoot);
const rootReact = resolveVersion("react", repoRoot);
const failures = [];

if (mobileReact !== rendererVersion) {
  failures.push(`apps/mobile resolves react ${mobileReact} but the renderer is ${rendererVersion}`);
}
if (rootReact !== rendererVersion) {
  failures.push(`the hoisted react is ${rootReact} (Metro can pick this up) but the renderer is ${rendererVersion}`);
}

// A second React anywhere in the tree is the usual cause of the mismatch.
const tree = execFileSync("npm", ["ls", "react", "--all"], { cwd: repoRoot, encoding: "utf8" });
// `npm ls` also prints names like lucide-react@0.577.0 — only bare react@x.y.z
const versions = [
  ...new Set(
    (tree.match(/(?:^|[^\w-])react@(\d+\.\d+\.\d+)/gm) ?? []).map((v) => v.split("@")[1]),
  ),
];
if (versions.length > 1) {
  failures.push(`multiple React versions installed: ${versions.join(", ")}`);
}

if (failures.length) {
  console.error("✗ react version alignment failed:");
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error(`\nFix: pin react/react-dom to ${rendererVersion} in the root, web and mobile package.json.`);
  process.exit(1);
}

console.log(`✓ react ${mobileReact} matches the react-native renderer (${rendererVersion}), single copy in the tree`);
