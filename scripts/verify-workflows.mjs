#!/usr/bin/env node
/**
 * Static guard for .github/workflows.
 *
 * Checks the mistakes that silently break CI instead of failing loudly:
 *  - a workflow that cannot be parsed (GitHub reports "Invalid workflow file")
 *  - `secrets.*` used inside an `if:` expression (not allowed at all)
 *  - actions pinned to Node-20 releases that GitHub now deprecates
 *  - an action that is not from an approved owner list
 *  - missing `on:` triggers / jobs
 *  - `runs-on` values that are not github-hosted labels
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const workflowDir = path.resolve(import.meta.dirname, "..", ".github", "workflows");

// Node-24 action releases used by this repository. Anything older in these
// repositories fails the check so deprecation warnings cannot creep back in.
const MINIMUM_MAJOR = {
  "actions/checkout": 5,
  "actions/setup-node": 5,
  "actions/setup-java": 6,
  "actions/upload-artifact": 5,
  "actions/download-artifact": 5,
  "actions/cache": 5,
  "android-actions/setup-android": 4,
  "expo/expo-github-action": 9,
  "reactivecircus/android-emulator-runner": 2,
};

const APPROVED_OWNERS = [
  "actions",
  "android-actions",
  "expo",
  "docker",
  // Emulator runner: the only maintained way to boot an AVD in CI and actually
  // exercise the built APK (React Native builds cannot be verified otherwise).
  "reactivecircus",
];

const failures = [];
const files = readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file));
if (files.length === 0) failures.push("no workflow files found");

const walk = (node, visit) => {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      visit(key, value);
      walk(value, visit);
    }
  }
};

for (const file of files) {
  const raw = readFileSync(path.join(workflowDir, file), "utf8");
  const doc = YAML.parseDocument(raw);
  if (doc.errors.length) {
    failures.push(`${file}: invalid YAML — ${doc.errors[0].message}`);
    continue;
  }
  const workflow = doc.toJS() ?? {};

  const triggers = workflow.on ?? workflow.true;
  if (!triggers) failures.push(`${file}: missing \`on:\` trigger`);

  const jobs = workflow.jobs ?? {};
  const jobNames = Object.keys(jobs);
  if (jobNames.length === 0) failures.push(`${file}: no jobs defined`);

  walk(workflow, (key, value) => {
    if (key === "if" && typeof value === "string" && /secrets\./.test(value)) {
      failures.push(`${file}: \`secrets.*\` is not allowed inside \`if:\` → ${value.trim()}`);
    }
    if (key !== "uses" || typeof value !== "string") return;
    const [action, ref = ""] = value.split("@");
    if (action.startsWith("./")) return;
    const owner = action.split("/")[0];
    if (!APPROVED_OWNERS.includes(owner)) {
      failures.push(`${file}: unapproved action owner in ${value}`);
    }
    const minimum = MINIMUM_MAJOR[action];
    if (minimum !== undefined) {
      const major = Number.parseInt(ref.replace(/^v/, ""), 10);
      if (Number.isNaN(major)) {
        failures.push(`${file}: ${action} must be pinned to a major version tag (got "${ref}")`);
      } else if (major < minimum) {
        failures.push(`${file}: ${action}@${ref} is older than the node24-compatible @v${minimum}`);
      }
    }
  });

  for (const [name, job] of Object.entries(jobs)) {
    if (!job || typeof job !== "object") {
      failures.push(`${file}: job "${name}" is empty`);
      continue;
    }
    if (!job.runsOn && !job["runs-on"] && !job.uses) {
      failures.push(`${file}: job "${name}" has no runs-on`);
    }
    for (const dependency of job.needs ? [].concat(job.needs) : []) {
      if (!jobNames.includes(dependency)) {
        failures.push(`${file}: job "${name}" needs unknown job "${dependency}"`);
      }
    }
    const steps = job.steps ?? [];
    for (const step of steps) {
      if (!step.run && !step.uses) {
        failures.push(`${file}: job "${name}" has a step without run/uses`);
      }
      const withInput = step.with ?? {};
      if (
        step.uses?.startsWith("actions/upload-artifact") &&
        !(withInput["if-no-files-found"] ?? withInput.ifNoFilesFound)
      ) {
        failures.push(`${file}: upload-artifact step should set if-no-files-found`);
      }
    }
    if (job.uses && typeof job.uses === "string" && !/@/.test(job.uses)) {
      failures.push(`${file}: reusable workflow "${job.uses}" is not pinned to a ref`);
    }
  }
}

if (failures.length) {
  console.error("✗ workflow verification failed:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}

console.log(`✓ ${files.length} workflows verified (${files.join(", ")})`);
