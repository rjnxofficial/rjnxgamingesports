#!/usr/bin/env node
/**
 * Applies the RJNX migrations to the configured Postgres database.
 *
 *   DATABASE_URL="postgresql://postgres:pw@db.<ref>.supabase.co:5432/postgres" npm run db:push --workspace @rjnx/web
 *
 * - Every migration file in ../../supabase/migrations is applied in name order.
 * - Applied files are recorded in rjnx.schema_migrations so re-runs are no-ops.
 * - Nothing outside the `rjnx` schema is created or dropped.
 * - Add --with-seed to also run supabase/seed.sql.
 */
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "../../../supabase/migrations");
const seedFile = join(here, "../../../supabase/seed.sql");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      [
        "DATABASE_URL is not set.",
        "",
        "Get it from Supabase → Project settings → Database → Connection string (URI).",
        "Example:",
        '  export DATABASE_URL="postgresql://postgres:PASSWORD@db.nuckewrlcjphjmnfgilo.supabase.co:5432/postgres"',
        "  npm run db:push --workspace @rjnx/web",
      ].join("\n"),
    );
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("The `pg` package is required. Run `npm install` in the repository root first.");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✓ connected");

  // Track applied migrations inside the rjnx schema only.
  await client.query("create schema if not exists rjnx");
  await client.query(`
    create table if not exists rjnx.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const { rows } = await client.query("select filename from rjnx.schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• skip ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), "utf8");
    process.stdout.write(`→ applying ${file} … `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into rjnx.schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log("done");
    } catch (error) {
      await client.query("rollback");
      console.error(`\n✗ ${file} failed: ${error.message}`);
      if (error.position) console.error(`  at position ${error.position}`);
      if (error.detail) console.error(`  ${error.detail}`);
      await client.end();
      process.exit(1);
    }
  }

  if (process.argv.includes("--with-seed")) {
    process.stdout.write("→ applying seed.sql … ");
    const sql = await readFile(seedFile, "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log("done");
    } catch (error) {
      await client.query("rollback");
      console.error(`\n✗ seed failed: ${error.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log("\nAll migrations applied. Next steps:");
  console.log("  1. Create your account on the website (/register).");
  console.log("  2. Promote it to super admin:");
  console.log("     select rjnx.bootstrap_super_admin('you@example.com');");
  console.log("  3. Create the `avatars` storage bucket (public read) in Supabase → Storage.");

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
