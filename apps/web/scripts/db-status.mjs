#!/usr/bin/env node
/**
 * Live backend status probe (publishable key only, RLS applies).
 *
 * Reports, per table, whether the deployed Supabase project exposes it through
 * the `rjnx` schema, and whether the required RPCs answer. Designed to run in CI
 * (which has network egress) and print a Markdown table into the step summary,
 * so "the site is up but the database is empty" is visible instead of implied.
 *
 * Usage: node apps/web/scripts/db-status.mjs [--json]
 */
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const TABLES = [
  "profiles",
  "user_roles",
  "games",
  "scoring_rules",
  "tournaments",
  "teams",
  "team_members",
  "team_invitations",
  "tournament_registrations",
  "matches",
  "match_participants",
  "match_results",
  "leaderboard_entries",
  "notifications",
  "news_articles",
  "platform_settings",
  "audit_logs",
  "support_tickets",
  "banners",
  "payments",
  "push_tokens",
];

const VIEWS = ["global_leaderboard", "public_platform_stats", "tournament_slot_counts"];

const RPCS = [
  { name: "player_stats", args: { p_user_id: "00000000-0000-0000-0000-000000000000" } },
  { name: "admin_stats", args: {} },
  { name: "refresh_tournament_statuses", args: {} },
  { name: "recalculate_leaderboard", args: { p_tournament_id: "00000000-0000-0000-0000-000000000000" } },
];

if (!url || !key) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  process.exit(1);
}

async function probeTable(table) {
  const started = Date.now();
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, "accept-profile": "rjnx" },
    });
    const ms = Date.now() - started;
    if (response.ok) {
      const rows = await response.json();
      return { table, status: "ok", rows: Array.isArray(rows) ? rows.length : 0, ms };
    }
    const body = await response.text();
    if (/PGRST106|Invalid schema/i.test(body)) {
      // Everything is failing for the same reason; do not spam one row per table.
      return {
        table,
        status: "schema-not-exposed",
        detail: "PostgREST does not expose the rjnx schema (see remediation below)",
        ms,
      };
    }
    const missing = response.status === 404 || /PGRST20[0-9]|does not exist/.test(body);
    return { table, status: missing ? "missing" : `http ${response.status}`, detail: body.slice(0, 160), ms };
  } catch (error) {
    return { table, status: "unreachable", detail: error.message, ms: Date.now() - started };
  }
}

async function probeRpc({ name, args }) {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "accept-profile": "rjnx",
        "content-profile": "rjnx",
      },
      body: JSON.stringify(args),
    });
    const body = await response.text();
    if (response.ok) return { name, status: "ok" };
    if (/does not exist|PGRST202/.test(body)) return { name, status: "missing" };
    // A permission error still proves the function is deployed.
    if (/permission denied|42501/.test(body)) return { name, status: "deployed (permission denied)" };
    return { name, status: `http ${response.status}`, detail: body.slice(0, 120) };
  } catch (error) {
    return { name, status: "unreachable", detail: error.message };
  }
}

const tables = await Promise.all(TABLES.map(probeTable));
const views = await Promise.all(VIEWS.map(probeTable));
const rpcs = [];
for (const rpc of RPCS) rpcs.push(await probeRpc(rpc));

const result = { url, tables, views, rpcs };
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Backend: ${url}\n`);
  console.log("| Object | Type | Status |");
  console.log("| --- | --- | --- |");
  for (const row of [...tables, ...views]) {
    console.log(`| ${row.table} | ${VIEWS.includes(row.table) ? "view" : "table"} | ${row.status} |`);
  }
  for (const row of rpcs) console.log(`| ${row.name}() | rpc | ${row.status} |`);

  const broken = [...tables, ...views].filter((row) => row.status !== "ok");
  const notExposed = broken.filter((row) => row.status === "schema-not-exposed");
  if (notExposed.length) {
    console.log(
      [
        "",
        "REMEDIATION — the rjnx schema is not exposed to the Data API.",
        "Supabase dashboard → Project Settings → API → Exposed schemas: add `rjnx`.",
        "Or via SQL (service role):",
        "  alter role authenticator set pgrst.db_schemas = 'public, graphql_public, rjnx';",
        "  notify pgrst, 'reload config';",
        "Then re-run: node apps/web/scripts/db-status.mjs",
        "",
      ].join("\n"),
    );
  }
  const missingRpcs = rpcs.filter((row) => row.status === "missing" || row.status === "unreachable");
  console.log("");
  if (broken.length || missingRpcs.length) {
    console.error(
      `✗ backend incomplete: ${broken.length} object(s) unavailable, ${missingRpcs.length} RPC(s) missing. ` +
        "Apply supabase/migrations with `npm run db:push` (needs DATABASE_URL).",
    );
    process.exit(2);
  }
  console.log(`✓ backend complete: ${tables.length} tables, ${views.length} views, ${rpcs.length} RPCs reachable with the publishable key`);
}
