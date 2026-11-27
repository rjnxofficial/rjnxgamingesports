-- 0005_admin_bootstrap.sql
-- One-time super-admin bootstrap helper.
--
-- Roles can never be self-assigned through the API: user_roles inserts are
-- restricted to super admins by RLS. This security-definer function lets the
-- project owner promote an existing account from the Supabase SQL editor,
-- and refuses to run once any super admin exists unless force = true.

-- =====================================================================
-- BOOTSTRAP SUPER ADMIN
-- Promote an existing auth user (create the account via the website signup
-- or Supabase dashboard first), then run the statement below with the email.
--
--   select rjnx.bootstrap_super_admin('owner@example.com');
--
-- The function refuses to run if any super admin already exists unless
-- `force` is passed as true.
-- =====================================================================
create or replace function rjnx.bootstrap_super_admin(p_email text, p_force boolean default false)
returns text
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_uid uuid;
  v_existing integer;
begin
  select count(*) into v_existing from rjnx.user_roles where role = 'super_admin';
  if v_existing > 0 and not p_force then
    raise exception 'SUPER_ADMIN_EXISTS' using errcode = 'P0001';
  end if;

  select id into v_uid from auth.users where email = lower(p_email);
  if v_uid is null then
    raise exception 'USER_NOT_FOUND: create the account first' using errcode = 'P0002';
  end if;

  insert into rjnx.user_roles (user_id, role) values (v_uid, 'super_admin')
  on conflict (user_id, role) do nothing;

  update rjnx.profiles set is_suspended = false where id = v_uid;
  insert into rjnx.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'role.bootstrap_super_admin', 'user', v_uid::text, jsonb_build_object('email', p_email));

  return v_uid::text;
end $$;

-- Executable by the database owner (SQL editor) only, never by API clients.
revoke all on function rjnx.bootstrap_super_admin(text, boolean) from public;
revoke all on function rjnx.bootstrap_super_admin(text, boolean) from anon, authenticated;
