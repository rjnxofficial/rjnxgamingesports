-- 0006_profile_username.sql
-- Honour the username chosen at sign-up.
--
-- 0002 derived every profile username from the email local part, which meant a
-- player who registered as "SavageKing" ended up as "savageking12". The trigger
-- now prefers the username supplied in auth metadata (validated against the
-- profiles_username_format constraint) and only falls back to the email-derived
-- candidate when it is missing, invalid or already taken.

create or replace function rjnx.handle_new_user()
returns trigger
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_username text;
  v_base     text;
  v_suffix   int := 0;
  v_meta     text;
begin
  -- 1. Prefer the username the client sent with the sign-up request.
  v_meta := lower(nullif(btrim(new.raw_user_meta_data->>'username'), ''));
  if v_meta is not null and v_meta ~ '^[a-z0-9_.]{3,24}$' then
    if not exists (select 1 from rjnx.profiles where username = v_meta) then
      v_username := v_meta;
    end if;
  end if;

  -- 2. Otherwise derive a candidate from the email address.
  if v_username is null then
    v_base := coalesce(
      nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_.]', '', 'g'), ''),
      'player'
    );
    v_base := substr(v_base, 1, 18);
    if length(v_base) < 3 then
      v_base := 'player' || substr(replace(new.id::text, '-', ''), 1, 4);
    end if;
    v_username := v_base;
    while exists (select 1 from rjnx.profiles where username = v_username) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || v_suffix::text;
    end loop;
  end if;

  insert into rjnx.profiles (id, username, full_name, email, phone, avatar_url)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into rjnx.user_roles (user_id, role)
  values (new.id, 'player')
  on conflict (user_id, role) do nothing;

  return new;
end $$;

-- Repair profiles created by the previous trigger version: when the stored
-- username is purely derived from the email and the requested username in
-- metadata is still free, adopt the requested one. Purely additive, and only
-- touches rows whose owner asked for a different handle at sign-up.
do $$
declare
  rec record;
  v_wanted text;
begin
  for rec in
    select p.id, p.username
    from rjnx.profiles p
    join auth.users u on u.id = p.id
    where u.raw_user_meta_data ? 'username'
  loop
    select lower(btrim(u.raw_user_meta_data->>'username')) into v_wanted
    from auth.users u
    where u.id = rec.id;

    if v_wanted is not null
       and v_wanted ~ '^[a-z0-9_.]{3,24}$'
       and v_wanted <> rec.username
       and not exists (select 1 from rjnx.profiles where username = v_wanted) then
      update rjnx.profiles set username = v_wanted where id = rec.id;
    end if;
  end loop;
end $$;
