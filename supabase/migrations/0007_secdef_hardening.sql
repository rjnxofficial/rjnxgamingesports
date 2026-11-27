-- 0007_secdef_hardening.sql
-- Privilege hardening for SECURITY DEFINER helpers.
--
-- rjnx.refresh_tournament_statuses() is a maintenance routine: it is invoked by
-- scheduled jobs (pg_cron / dashboard SQL editor) with the database owner, never
-- by API clients. Without this revoke it would be callable by any signed-in
-- user through PostgREST, letting them flip tournament states at will.
--
-- Purely additive and idempotent: no table, row or policy is modified.

revoke all on function rjnx.refresh_tournament_statuses() from public;
revoke all on function rjnx.refresh_tournament_statuses() from anon, authenticated;

-- Same treatment for the one-time bootstrap helper (defence in depth; also
-- revoked in 0005).
revoke all on function rjnx.bootstrap_super_admin(text, boolean) from public;
revoke all on function rjnx.bootstrap_super_admin(text, boolean) from anon, authenticated;
