#!/usr/bin/env node
/**
 * Static verification of the Supabase layer. Runs in CI *without* database
 * credentials, so a broken migration, an unprotected table or a leaked secret
 * fails the pipeline before anything touches the live project.
 *
 * Checks
 *  1. Every migration parses far enough to be ordered and non-empty.
 *  2. Every table created in the schema has RLS enabled.
 *  3. Every table has at least one policy.
 *  4. Required RPCs exist and are granted to the right roles.
 *  5. No destructive statements (drop table / truncate / drop schema).
 *  6. No hardcoded service-role keys, JWTs, DB passwords or provider secrets.
 *
 * Exit code 0 = pass (warnings allowed), 1 = failure.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const migrationsDir = join(repoRoot, "supabase/migrations");

const REQUIRED_RPCS = [
  "register_for_tournament",
  "cancel_registration",
  "match_room_credentials",
  "recalculate_leaderboard",
  "player_stats",
  "admin_stats",
  "refresh_tournament_statuses",
  "bootstrap_super_admin",
];

const failures = [];
const warnings = [];
const info = [];

function fail(message) {
  failures.push(message);
}

/* ------------------------------------------------------------------ files */
const entries = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
if (!entries.length) fail("supabase/migrations contains no .sql files");
info.push(`migration files: ${entries.join(", ")}`);

let all = "";
const perFile = new Map();
for (const file of entries) {
  const path = join(migrationsDir, file);
  const size = (await stat(path)).size;
  const sql = await readFile(path, "utf8");
  if (size < 50) fail(`${file} is suspiciously small (${size} bytes)`);
  if (!sql.trim()) fail(`${file} is empty`);
  // strip line comments so a commented-out statement never counts as real DDL
  const stripped = sql.replace(/--[^\n]*/g, "");
  perFile.set(file, stripped);
  all += `\n${stripped}`;
}

/* ------------------------------------------------- destructive statements */
const destructive = [
  [/drop\s+table\s+(?!if\s+exists\s+rjnx\.schema_migrations)/i, "DROP TABLE"],
  [/truncate\s+(table\s+)?rjnx\./i, "TRUNCATE"],
  [/drop\s+schema\s+(?!if\s+exists)/i, "DROP SCHEMA"],
  [/delete\s+from\s+rjnx\.[a-z_]+\s*;/i, "unqualified DELETE"],
];
for (const [file, sql] of perFile) {
  for (const [pattern, label] of destructive) {
    if (pattern.test(sql)) fail(`${file} contains a destructive statement (${label})`);
  }
}

/* ------------------------------------------------------------- RLS checks */
const createdTables = [...all.matchAll(/create\s+table\s+(if\s+not\s+exists\s+)?rjnx\.([a-z_]+)/gi)].map(
  (match) => match[2],
);
const uniqueTables = [...new Set(createdTables)].sort();
const rlsEnabled = new Set(
  [...all.matchAll(/alter\s+table\s+rjnx\.([a-z_]+)\s+enable\s+row\s+level\s+security/gi)].map((m) => m[1]),
);
const policyTables = new Set([...all.matchAll(/create\s+policy\s+\w+\s+on\s+rjnx\.([a-z_]+)/gi)].map((m) => m[1]));

info.push(`tables: ${uniqueTables.length}`);
for (const table of uniqueTables) {
  if (!rlsEnabled.has(table)) fail(`rjnx.${table} has no "enable row level security"`);
  if (!policyTables.has(table)) fail(`rjnx.${table} has no RLS policy`);
}
for (const table of rlsEnabled) {
  if (!uniqueTables.includes(table)) warnings.push(`RLS enabled on unknown table rjnx.${table}`);
}

/* -------------------------------------------------------------- RPC checks */
for (const rpc of REQUIRED_RPCS) {
  const defined = new RegExp(`create\\s+or\\s+replace\\s+function\\s+rjnx\\.${rpc}\\s*\\(`, "i").test(all);
  if (!defined) {
    fail(`required RPC rjnx.${rpc}() is not defined`);
    continue;
  }
  const granted = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+rjnx\\.${rpc}\\s*\\(`, "i").test(all);
  const deliberatelyRestricted = new RegExp(
    `revoke\\s+all\\s+on\\s+function\\s+rjnx\\.${rpc}\\s*\\([^)]*\\)\\s+from\\s+(public|anon|authenticated)`,
    "i",
  ).test(all);
  if (!granted && !deliberatelyRestricted) warnings.push(`rjnx.${rpc}() has no explicit grant/revoke`);
  if (granted && deliberatelyRestricted) {
    warnings.push(`rjnx.${rpc}() is both granted and revoked — check the intended exposure`);
  }
}

/* ---------------------------------------------- security-definer hardening */
const definerFns = [...all.matchAll(/create\s+or\s+replace\s+function\s+rjnx\.([a-z_]+)[\s\S]{0,400}?security\s+definer/gi)].map(
  (m) => m[1],
);
for (const fn of new Set(definerFns)) {
  const body = all.slice(all.indexOf(`rjnx.${fn}(`), all.indexOf(`rjnx.${fn}(`) + 800);
  if (!/set\s+search_path\s*=/i.test(body)) {
    warnings.push(`security definer function rjnx.${fn}() does not pin search_path`);
  }
}

/* ---------------------------------------------------------- secret checks */
/**
 * Real secrets only. Documentation placeholders such as
 * `postgresql://postgres:PASSWORD@db.<ref>.supabase.co` or `RAZORPAY_KEY_SECRET=`
 * (empty assignment in .env.example) are explicitly not leaks.
 */
const PLACEHOLDER = /(PASSWORD|PASS|SECRET|YOUR|<[^>]+>|\$\{|\.\.\.|xxx+|EXAMPLE|CHANGEME|REPLACE)/i;
const SECRET_PATTERNS = [
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "JWT / service-role key"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "Supabase secret key"],
  [/postgres(ql)?:\/\/[^@\s"']+:([^@\s"'/]{6,})@/i, "database URL with inline password"],
  [/\b(sk|rk)_live_[A-Za-z0-9]{10,}/, "live payment secret"],
  [/RAZORPAY_KEY_SECRET\s*=\s*[^\s"'#]{6,}/, "hardcoded Razorpay secret"],
];

function isPlaceholder(text, match) {
  if (PLACEHOLDER.test(match[0])) return true;
  // A shell/env reference like ${DATABASE_URL} or ${{ secrets.X }} is not a secret.
  return /\$\{/.test(match[0]);
}
const scanTargets = [
  "supabase/seed.sql",
  ".env.example",
  "apps/mobile/.env.example",
  ".github/workflows/website.yml",
  ".github/workflows/android.yml",
  ".github/workflows/database.yml",
  "apps/web/scripts/db-setup.mjs",
  "apps/web/scripts/db-check.mjs",
];
for (const target of scanTargets) {
  let content;
  try {
    content = await readFile(join(repoRoot, target), "utf8");
  } catch {
    continue;
  }
  for (const [pattern, label] of SECRET_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      // The publishable/anon key is designed to be public; placeholders are fine.
      if (/sb_publishable_/.test(match[0]) || isPlaceholder(content, match)) continue;
      fail(`${target} appears to contain a ${label}: ${match[0].slice(0, 18)}…`);
    }
  }
}

/* ----------------------------------------------------------------- report */
console.log("Supabase static verification");
for (const line of info) console.log(`  · ${line}`);
for (const line of warnings) console.log(`  ! ${line}`);
if (failures.length) {
  console.error("\nFAILED:");
  for (const line of failures) console.error(`  ✗ ${line}`);
  process.exit(1);
}
console.log(`\n✓ ${entries.length} migrations, ${uniqueTables.length} tables (all protected), ${REQUIRED_RPCS.length} RPCs verified.`);
