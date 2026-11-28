-- =====================================================================
-- RJNX GAMING ESPORTS — 0009 expose the rjnx schema via PostgREST config
--
-- 0008 removed every *database-side* blocker (USAGE, grants, defaults) but the
-- API still answered `PGRST106 Invalid schema: rjnx` because PostgREST only
-- serves the schemas listed in its `db_schemas` setting.
--
-- The Supabase dashboard toggle (Project Settings -> API -> Exposed schemas)
-- performs exactly the ALTER ROLE + NOTIFY pair at the bottom of this file, so
-- doing it in a migration lets the pipeline repair the deployment without
-- anyone clicking through the dashboard.
--
-- Safety:
--   * idempotent — re-running only re-sets the same list;
--   * never *removes* a schema — an existing list is read, `rjnx` is appended
--     when missing, and every original entry is preserved;
--   * permission-tolerant — if the migration role cannot alter the
--     `authenticator` role (managed instances differ), the exception is caught
--     and reported as a notice instead of aborting the migration run. The
--     dashboard path stays open, and 0008's `rjnx.schema_status()` still
--     reports the truth.
-- =====================================================================

do $$
declare
  current_list text;
  wanted text[] := array['public', 'graphql_public', 'rjnx'];
  merged text := '';
  entry text;
begin
  -- What PostgREST is configured with right now (NULL when unset).
  current_list := current_setting('pgrst.db_schemas', true);

  merged := array_to_string(wanted, ',');

  if current_list is not null and length(btrim(current_list)) > 0 then
    foreach entry in array string_to_array(current_list, ',') loop
      entry := btrim(entry);
      if length(entry) > 0 and entry <> all (wanted) then
        merged := merged || ',' || entry;
      end if;
    end loop;
  end if;

  begin
    execute format('alter role authenticator set pgrst.db_schemas = %L', merged);

    -- PostgREST re-reads its settings on this NOTIFY; it is what the dashboard's
    -- "Reload" button sends. Harmless when no listener is attached.
    notify pgrst, 'reload config';

    raise notice 'rjnx exposed to PostgREST (db_schemas = %)', merged;
  exception
    when insufficient_privilege or undefined_object then
      raise notice 'Could not alter role authenticator (%); expose rjnx from the Supabase dashboard instead.', sqlerrm;
  end;
end $$;

-- Belt-and-braces: restate the schema privilege from 0008 so this file is safe
-- to apply on its own.
grant usage on schema rjnx to anon, authenticated, service_role;

comment on schema rjnx is
  'RJNX Gaming Esports application schema. Must be listed in PostgREST db_schemas (see 0009).';
