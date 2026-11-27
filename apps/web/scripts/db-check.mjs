#!/usr/bin/env node
/**
 * Read-only inspection of a Supabase/Postgres database.
 *
 *   DATABASE_URL="postgresql://…" npm run db:check --workspace @rjnx/web
 *
 * Reports existing schemas, tables and row counts WITHOUT modifying anything.
 * Run this before `db:push` when you need to confirm the target project state.
 */
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set — see docs/supabase-setup.md");
    process.exit(1);
  }

  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: schemas } = await client.query(
    "select schema_name from information_schema.schemata where schema_name not like 'pg_%' and schema_name <> 'information_schema' order by 1",
  );
  console.log("Schemas:", schemas.map((row) => row.schema_name).join(", "));

  for (const schema of ["public", "rjnx"]) {
    const { rows: tables } = await client.query(
      `select table_name from information_schema.tables where table_schema = $1 order by 1`,
      [schema],
    );
    console.log(`\n${schema} tables (${tables.length}):`, tables.map((row) => row.table_name).join(", ") || "—");
  }

  const { rows: applied } = await client
    .query("select filename from rjnx.schema_migrations order by 1")
    .catch(() => ({ rows: [] }));
  const localFiles = (await readdir(join(here, "../../../supabase/migrations"))).filter((file) => file.endsWith(".sql")).sort();
  const appliedSet = new Set(applied.map((row) => row.filename));

  console.log("\nMigrations:");
  for (const file of localFiles) {
    console.log(`  ${appliedSet.has(file) ? "✓" : "•"} ${file}`);
  }

  const { rows: rls } = await client
    .query(
      `select c.relname as table, c.relrowsecurity as rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'rjnx' and c.relkind = 'r' order by 1`,
    )
    .catch(() => ({ rows: [] }));

  if (rls.length) {
    const unprotected = rls.filter((row) => !row.rls);
    console.log(`\nRLS: ${rls.length - unprotected.length}/${rls.length} tables protected`);
    if (unprotected.length) console.log("  ⚠ no RLS:", unprotected.map((row) => row.table).join(", "));
  }

  const { rows: policies } = await client
    .query(
      `select tablename, count(*)::int as policies
         from pg_policies where schemaname = 'rjnx' group by tablename order by 1`,
    )
    .catch(() => ({ rows: [] }));
  if (policies.length) {
    console.log(`\nPolicies: ${policies.length} tables policed`);
    const withoutPolicies = rls
      .map((row) => row.table)
      .filter((table) => !policies.some((row) => row.tablename === table));
    if (withoutPolicies.length) console.log("  ⚠ no policy:", withoutPolicies.join(", "));
  }

  const { rows: rpcs } = await client
    .query(
      `select p.proname as name,
              pg_get_userbyid(p.proowner) as owner,
              coalesce(array_to_string(p.proacl, ', '), 'default') as acl
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'rjnx' and p.prokind = 'f' order by 1`,
    )
    .catch(() => ({ rows: [] }));
  if (rpcs.length) {
    console.log(`\nFunctions (${rpcs.length}):`);
    for (const row of rpcs) {
      const anon = /anon=/.test(row.acl);
      const auth = /authenticated=/.test(row.acl);
      const exposure = anon ? "anon+auth" : auth ? "authenticated" : "owner-only";
      console.log(`  · ${row.name} — ${exposure}`);
    }
    const ownerOnly = rpcs.filter((row) => !/anon=|authenticated=/.test(row.acl));
    if (ownerOnly.length) {
      console.log(`  note: ${ownerOnly.length} function(s) are not exposed to API clients (maintenance routines).`);
    }
  }

  // Fail loudly when the target database is behind the local migrations so a
  // workflow can never report success while leaving new migrations unapplied.
  const pending = localFiles.filter((file) => !appliedSet.has(file));
  await client.end();
  if (pending.length) {
    console.error(`\n✗ ${pending.length} migration(s) NOT applied: ${pending.join(", ")}`);
    process.exit(2);
  }
  console.log("\n✓ database is up to date with supabase/migrations");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
