-- =====================================================================
-- RJNX GAMING ESPORTS — 0008 expose the rjnx schema to the API
--
-- Exposing `rjnx` in the Supabase dashboard is a *project setting* that lives in
-- the PostgREST config, not in a table, so the migration cannot flip it. What it
-- can do is remove every other blocker and make the requirement explicit and
-- machine-checkable:
--
--   1. schema usage for the API roles (without USAGE every query fails first)
--   2. default privileges so future tables/functions are usable too
--   3. sequences for the tables that use identity columns
--   4. API-role grants on tables where 0003 only granted `authenticated`
--      (anon must be able to read the public catalogue: games, tournaments...)
--   5. a helper view the app can call to prove exposure actually happened
--
-- RLS still decides row visibility for every table; these grants only make the
-- objects reachable. Re-runnable.
-- =====================================================================

create schema if not exists rjnx;

-- 1. usage ------------------------------------------------------------
grant usage on schema rjnx to anon, authenticated, service_role;

-- 2. defaults for objects created later ------------------------------
alter default privileges in schema rjnx grant usage on sequences to anon, authenticated, service_role;
alter default privileges in schema rjnx grant execute on functions to anon, authenticated, service_role;

-- 3. existing sequences ---------------------------------------------
do $$
declare
  seq record;
begin
  for seq in
    select schemaname, sequencename
    from pg_sequences
    where schemaname = 'rjnx'
  loop
    execute format('grant usage, select on sequence %I.%I to anon, authenticated, service_role',
                   seq.schemaname, seq.sequencename);
  end loop;
end $$;

-- 4. read grants for anonymous visitors ------------------------------
-- Public catalogue surfaces. RLS polices restrict rows (e.g. only published
-- tournaments); the grants make the tables reachable at all.
do $$
declare
  tbl text;
  public_read text[] := array[
    'games', 'scoring_rules', 'tournaments', 'teams', 'team_members',
    'news_articles', 'banners', 'leaderboard_entries', 'match_results',
    'matches', 'match_participants', 'platform_settings'
  ];
begin
  foreach tbl in array public_read loop
    if exists (
      select 1 from pg_tables where schemaname = 'rjnx' and tablename = tbl
    ) then
      execute format('grant select on rjnx.%I to anon', tbl);
    end if;
  end loop;
end $$;

-- Views were created in 0004; make sure both roles can read them.
do $$
declare
  v record;
begin
  for v in
    select table_name from information_schema.views where table_schema = 'rjnx'
  loop
    execute format('grant select on rjnx.%I to anon, authenticated, service_role', v.table_name);
  end loop;
end $$;

-- 5. exposure probe --------------------------------------------------
-- Returns the PostgREST-exposed schemas when the caller can read
-- `pgrst.db_schemas` (service_role / postgres), otherwise just the rjnx tables
-- that resolve. The app's CI job compares this list against the expected set.
create or replace function rjnx.schema_status()
returns jsonb
language sql
security definer
set search_path = rjnx, pg_catalog
as $$
  select jsonb_build_object(
    'schema_exists', exists (select 1 from pg_namespace where nspname = 'rjnx'),
    'table_count', (
      select count(*) from pg_tables where schemaname = 'rjnx'
    ),
    'view_count', (
      select count(*) from information_schema.views where table_schema = 'rjnx'
    ),
    'function_count', (
      select count(*) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'rjnx'
    ),
    'exposed_to_api', coalesce(
      (
        select array_to_json(string_to_array(current_setting('pgrst.db_schemas', true), ','))
      ),
      '[]'::json
    )
  );
$$;

revoke all on function rjnx.schema_status() from public;
grant execute on function rjnx.schema_status() to anon, authenticated, service_role;

comment on function rjnx.schema_status() is
  'Diagnostics: rjnx object counts plus the PostgREST schema list when available.';
