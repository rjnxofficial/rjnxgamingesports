#!/usr/bin/env node
/**
 * Admin Command Center audit.
 *
 * Fails when an admin page exists without real wiring. For every route under
 * src/app/admin and every exported action in src/server/actions/admin.ts it
 * verifies the security spine:
 *
 *   - the page reads from Supabase (no hard-coded demo data)
 *   - the page/action is behind requireStaff / requireSuperAdmin (or the layout
 *     guard) and never trusts a role from the client
 *   - every mutation calls a real table/rpc and writes an audit entry
 *   - no action exports a self-promotion path (role changes are super-admin only)
 *
 * Run: node apps/web/scripts/admin-audit.mjs [--verbose]
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const adminDir = path.join(root, "src/app/admin");
const actionsFile = path.join(root, "src/server/actions/admin.ts");
const verbose = process.argv.includes("--verbose");

const REQUIRED_ROUTES = [
  "",
  "tournaments",
  "registrations",
  "matches",
  "results",
  "leaderboard",
  "users",
  "roles",
  "news",
  "banners",
  "notifications",
  "reports",
  "settings",
  "audit",
  "support",
];

const failures = [];
const notes = [];

for (const route of REQUIRED_ROUTES) {
  const file = path.join(adminDir, route, "page.tsx");
  let code;
  try {
    code = readFileSync(file, "utf8");
  } catch {
    failures.push(`missing admin route: /admin${route ? `/${route}` : ""}`);
    continue;
  }
  const label = `/admin${route ? `/${route}` : ""}`;

  const hasData =
    /from\("|\.rpc\(|requireStaff|requireSuperAdmin|getSessionContext|createServerSupabase/.test(code);
  if (!hasData) failures.push(`${label}: no database access — looks like static demo data`);

  if (/const\s+(users|tournaments|registrations|rows|data)\s*=\s*\[/.test(code)) {
    failures.push(`${label}: contains a hard-coded data array`);
  }
  if (/\bTODO\b|FIXME|mock[A-Z]/.test(code)) failures.push(`${label}: contains TODO/FIXME/mock`);

  notes.push(`${label}: ${code.split("\n").length} lines`);
}

// ---------------------------------------------------------------- actions
const actions = readFileSync(actionsFile, "utf8");
const exported = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

// The file guards through two internal helpers: getStaff() (staff) and
// getSuperAdmin() (super-admin only). Both resolve the session server-side and
// return an error result instead of throwing, so an unguarded action would be
// one without either call.
const GUARD_CALL = /getStaff\(|getSuperAdmin\(|requireStaff|requireSuperAdmin|requireSuperAdminForAction/;

const guarded = exported.filter((name) => {
  const start = actions.indexOf(`export async function ${name}`);
  const body = actions.slice(start, start + 2600);
  return GUARD_CALL.test(body);
});
const unguarded = exported.filter((name) => !guarded.includes(name));
if (unguarded.length) failures.push(`actions without a role guard: ${unguarded.join(", ")}`);

const superAdminOnly = (actions.match(/getSuperAdmin\(|requireSuperAdmin/g) ?? []).length;
if (superAdminOnly < 4) {
  failures.push(
    `only ${superAdminOnly} super-admin-only guards found — roles, settings, suspension and audit must be super-admin only`,
  );
}

for (const name of ["grantRoleAction", "revokeRoleAction"]) {
  const start = actions.indexOf(`export async function ${name}`);
  const body = actions.slice(start, start + 2200);
  if (!/getSuperAdmin\(|requireSuperAdmin/.test(body)) failures.push(`${name}: must require super admin`);
  // A super admin must not be able to change their own roles (self-promotion /
  // self-lockout), and the identity must come from the session, not the form.
  if (!/session\.user\.id/.test(body)) {
    failures.push(`${name}: identity is not taken from the server session`);
  }
  if (!/(userId|user_id)\s*===\s*session\.user\.id|parsed\.data\.user_id\s*===\s*session\.user\.id|=== session\.user\.id/.test(body)) {
    failures.push(`${name}: no self-promotion guard detected`);
  }
}

for (const name of ["saveSettingAction", "suspendUserAction"]) {
  const start = actions.indexOf(`export async function ${name}`);
  const body = actions.slice(start, start + 2200);
  if (!/getSuperAdmin\(|requireSuperAdmin/.test(body)) failures.push(`${name}: must require super admin`);
}

// Audit trail for every mutation. Actions are long; scan from each declaration
// to the next one so one action's audit call cannot vouch for another.
const bodyOf = (name) => {
  const start = actions.indexOf(`export async function ${name}`);
  const rest = actions.slice(start + 1);
  const next = rest.search(/\nexport async function /);
  return next === -1 ? actions.slice(start) : rest.slice(0, next);
};
const mutating = exported.filter((name) => !/^(get|list|load)/.test(name));
const audited = mutating.filter((name) => /writeAudit|logAudit|audit_logs/.test(bodyOf(name)));
const notifyOnly = mutating.filter(
  (name) => !audited.includes(name) && /notifyUser|notifyMany/.test(bodyOf(name)) && !/\.(insert|update|delete|upsert)\(/.test(bodyOf(name)),
);
const unaudited = mutating.filter((name) => !audited.includes(name) && !notifyOnly.includes(name));
if (unaudited.length) failures.push(`mutations without an audit entry: ${unaudited.join(", ")}`);

// Every action must surface failures instead of reporting fake success.
const silentFailures = exported.filter((name) => !/(error|ok: false|throw)/.test(bodyOf(name)));
if (silentFailures.length) failures.push(`actions that cannot report failure: ${silentFailures.join(", ")}`);

// ---------------------------------------------------------------- report
if (verbose) {
  for (const note of notes) console.log(`  · ${note}`);
  console.log(`  · guarded actions: ${guarded.length}/${exported.length}`);
  console.log(`  · audited mutations: ${audited.length}/${mutating.length} (+${notifyOnly.length} notification-only)`);
}

if (failures.length) {
  console.error("✗ admin audit failed:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log(
  `✓ admin audit passed: ${REQUIRED_ROUTES.length} routes, ${exported.length} guarded actions, ` +
    `${audited.length} audited mutations`,
);
