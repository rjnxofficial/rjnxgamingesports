-- =====================================================================
-- RJNX GAMING ESPORTS — 0002 helper functions, triggers and transactions
-- =====================================================================
set check_function_bodies = off;

-- ------------------------------------------------------- role helpers
create or replace function rjnx.current_roles()
returns text[]
language sql stable security definer set search_path = rjnx, public as $$
  select coalesce(array_agg(role::text), array['player']::text[])
  from rjnx.user_roles
  where user_id = auth.uid();
$$;

create or replace function rjnx.has_role(required text)
returns boolean
language sql stable security definer set search_path = rjnx, public as $$
  select exists (
    select 1 from rjnx.user_roles
    where user_id = auth.uid()
      and role::text = required
  );
$$;

create or replace function rjnx.is_staff()
returns boolean
language sql stable security definer set search_path = rjnx, public as $$
  select exists (
    select 1 from rjnx.user_roles
    where user_id = auth.uid()
      and role::text in ('super_admin','admin','tournament_manager','moderator')
  );
$$;

create or replace function rjnx.is_super_admin()
returns boolean
language sql stable security definer set search_path = rjnx, public as $$
  select exists (
    select 1 from rjnx.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function rjnx.can_manage_tournaments()
returns boolean
language sql stable security definer set search_path = rjnx, public as $$
  select exists (
    select 1 from rjnx.user_roles
    where user_id = auth.uid()
      and role::text in ('super_admin','admin','tournament_manager')
  );
$$;

create or replace function rjnx.is_active_user()
returns boolean
language sql stable security definer set search_path = rjnx, public as $$
  select coalesce((select not is_suspended from rjnx.profiles where id = auth.uid()), false);
$$;

-- --------------------------------------------------- profile bootstrap
create or replace function rjnx.handle_new_user()
returns trigger
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_username text;
  v_base text;
  v_suffix int := 0;
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function rjnx.handle_new_user();

-- Keep email in the profile in sync when auth changes it.
create or replace function rjnx.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = rjnx, public as $$
begin
  update rjnx.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function rjnx.handle_user_email_change();

-- ---------------------------------------------------------- audit + notify
create or replace function rjnx.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_metadata jsonb default null
) returns void
language sql security definer set search_path = rjnx, public as $$
  insert into rjnx.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
$$;

create or replace function rjnx.notify(
  p_user_id uuid,
  p_type rjnx.notification_type,
  p_title text,
  p_body text default null,
  p_link text default null
) returns void
language sql security definer set search_path = rjnx, public as $$
  insert into rjnx.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

-- ------------------------------------------------- registration engine
create or replace function rjnx.register_for_tournament(
  p_tournament_id uuid,
  p_team_id uuid default null
) returns rjnx.tournament_registrations
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_uid uuid := auth.uid();
  v_t rjnx.tournaments;
  v_profile rjnx.profiles;
  v_taken integer;
  v_team_size integer;
  v_status rjnx.registration_status;
  v_slot integer;
  v_reg rjnx.tournament_registrations;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_profile from rjnx.profiles where id = v_uid;
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = 'P0002';
  end if;
  if v_profile.is_suspended then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;

  -- Lock the tournament row so concurrent registrations cannot overfill slots.
  select * into v_t from rjnx.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception 'TOURNAMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_t.status not in ('registration_open','published','registration_closed') then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if v_t.status = 'registration_closed' then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if v_t.registration_starts_at is not null and now() < v_t.registration_starts_at then
    raise exception 'REGISTRATION_NOT_STARTED' using errcode = 'P0001';
  end if;
  if v_t.registration_ends_at is not null and now() > v_t.registration_ends_at then
    raise exception 'REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from rjnx.tournament_registrations
    where tournament_id = p_tournament_id and user_id = v_uid
      and status in ('pending','approved','waitlisted')
  ) then
    raise exception 'ALREADY_REGISTERED' using errcode = '23505';
  end if;

  if v_t.mode <> 'solo' then
    if p_team_id is null then
      raise exception 'TEAM_REQUIRED' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from rjnx.team_members where team_id = p_team_id and user_id = v_uid
    ) then
      raise exception 'NOT_A_TEAM_MEMBER' using errcode = '42501';
    end if;
    select count(*) into v_team_size from rjnx.team_members where team_id = p_team_id;
    if v_team_size < v_t.min_team_size or v_team_size > v_t.max_team_size then
      raise exception 'INVALID_TEAM_SIZE' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from rjnx.tournament_registrations
      where tournament_id = p_tournament_id and team_id = p_team_id
        and status in ('pending','approved','waitlisted')
    ) then
      raise exception 'TEAM_ALREADY_REGISTERED' using errcode = '23505';
    end if;
  end if;

  select count(*) into v_taken
  from rjnx.tournament_registrations
  where tournament_id = p_tournament_id and status in ('pending','approved');

  if v_taken >= v_t.max_slots then
    raise exception 'TOURNAMENT_FULL' using errcode = 'P0001';
  end if;

  v_status := case when v_t.requires_approval then 'pending'::rjnx.registration_status
                   else 'approved'::rjnx.registration_status end;
  v_slot := v_taken + 1;

  insert into rjnx.tournament_registrations
    (tournament_id, user_id, team_id, status, slot_number,
     payment_status)
  values
    (p_tournament_id, v_uid, p_team_id, v_status, v_slot,
     case when v_t.entry_fee > 0 then 'pending'::rjnx.payment_status else 'paid'::rjnx.payment_status end)
  returning * into v_reg;

  perform rjnx.notify(
    v_uid,
    'registration',
    case when v_status = 'pending' then 'Registration submitted' else 'You are registered!' end,
    format('%s — slot #%s. %s', v_t.name, v_slot,
           case when v_status = 'pending' then 'Awaiting admin approval.' else 'See you on the battlefield.' end),
    '/tournaments/' || v_t.slug
  );

  perform rjnx.log_audit('registration.create', 'tournament_registration', v_reg.id::text,
    jsonb_build_object('tournament_id', p_tournament_id, 'team_id', p_team_id, 'status', v_status));

  return v_reg;
end $$;

create or replace function rjnx.cancel_registration(p_registration_id uuid)
returns rjnx.tournament_registrations
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_uid uuid := auth.uid();
  v_reg rjnx.tournament_registrations;
  v_t rjnx.tournaments;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;

  select r.* into v_reg from rjnx.tournament_registrations r
  where r.id = p_registration_id for update;
  if not found then raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into v_t from rjnx.tournaments where id = v_reg.tournament_id;
  if v_reg.user_id <> v_uid and not rjnx.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_reg.status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED' using errcode = 'P0001';
  end if;
  if v_t.status in ('live','completed') then
    raise exception 'TOURNAMENT_LOCKED' using errcode = 'P0001';
  end if;

  update rjnx.tournament_registrations
     set status = 'cancelled',
         reviewed_by = case when rjnx.is_staff() then v_uid else reviewed_by end,
         reviewed_at = case when rjnx.is_staff() then now() else reviewed_at end
   where id = p_registration_id
  returning * into v_reg;

  perform rjnx.notify(v_reg.user_id, 'registration', 'Registration cancelled',
    format('Your registration for %s was cancelled.', v_t.name),
    '/tournaments/' || v_t.slug);

  perform rjnx.log_audit('registration.cancel', 'tournament_registration', p_registration_id::text, null);
  return v_reg;
end $$;

-- ------------------------------------------------ leaderboard recompute
create or replace function rjnx.recalculate_leaderboard(p_tournament_id uuid)
returns integer
language plpgsql security definer set search_path = rjnx, public as $$
declare
  v_rows integer;
begin
  if not (rjnx.is_staff() or auth.role() = 'service_role') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  delete from rjnx.leaderboard_entries where tournament_id = p_tournament_id;

  insert into rjnx.leaderboard_entries
    (tournament_id, team_id, user_id, matches_played, total_kills, total_points, wins, best_placement, rank)
  select
    p_tournament_id,
    mp.team_id,
    case when mp.team_id is null then mp.user_id else null end,
    count(*)::int,
    coalesce(sum(res.kills), 0)::int,
    coalesce(sum(res.total_points), 0)::int,
    count(*) filter (where res.placement = 1)::int,
    min(res.placement),
    rame.rnk
  from rjnx.match_results res
  join rjnx.match_participants mp on mp.id = res.participant_id
  join rjnx.matches m on m.id = res.match_id
  join (
    select
      x.participant_id,
      row_number() over (
        order by
          sum(x.total_points) desc,
          sum(x.kills) desc,
          min(x.placement) asc nulls last,
          count(*) filter (where x.placement = 1) desc
      ) as rnk
    from rjnx.match_results x
    join rjnx.match_participants p2 on p2.id = x.participant_id
    join rjnx.matches m2 on m2.id = x.match_id
    where m2.tournament_id = p_tournament_id
    group by x.participant_id
  ) rame on rame.participant_id = res.participant_id
  where m.tournament_id = p_tournament_id
    and res.is_verified = true
  group by mp.team_id, mp.user_id, mp.id, rame.rnk;

  -- re-rank on the aggregated owner level (multiple participants per team are rare but valid)
  with ranked as (
    select id,
           row_number() over (
             order by total_points desc, total_kills desc, best_placement asc nulls last, wins desc
           ) as new_rank
    from rjnx.leaderboard_entries
    where tournament_id = p_tournament_id
  )
  update rjnx.leaderboard_entries l
     set rank = ranked.new_rank, updated_at = now()
    from ranked
   where l.id = ranked.id;

  get diagnostics v_rows = row_count;
  perform rjnx.log_audit('leaderboard.recalculate', 'tournament', p_tournament_id::text,
    jsonb_build_object('entries', v_rows));
  return v_rows;
end $$;

-- ------------------------------------------- room credential privacy
-- Base table columns room_id / room_password are never granted to clients.
-- Eligible participants (approved registration) and staff use this function.
create or replace function rjnx.match_room_credentials(p_match_id uuid)
returns table (room_id text, room_password text, published_at timestamptz)
language plpgsql stable security definer set search_path = rjnx, public as $$
declare
  v_uid uuid := auth.uid();
  v_match rjnx.matches;
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_match from rjnx.matches where id = p_match_id;
  if not found then
    raise exception 'MATCH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_match.room_published_at is null then
    return;
  end if;

  if rjnx.is_staff() then
    v_allowed := true;
  else
    select exists (
      select 1
      from rjnx.tournament_registrations r
      where r.tournament_id = v_match.tournament_id
        and r.user_id = v_uid
        and r.status = 'approved'
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'NOT_ELIGIBLE' using errcode = '42501';
  end if;

  return query select v_match.room_id, v_match.room_password, v_match.room_published_at;
end $$;

-- ------------------------------------------------------------ stats
create or replace function rjnx.player_stats(p_user_id uuid)
returns jsonb
language sql stable security definer set search_path = rjnx, public as $$
  with my_regs as (
    select * from rjnx.tournament_registrations
    where user_id = p_user_id and status in ('pending','approved','waitlisted')
  ),
  my_parts as (
    select mp.id from rjnx.match_participants mp where mp.user_id = p_user_id
    union
    select mp.id from rjnx.match_participants mp
      join rjnx.team_members tm on tm.team_id = mp.team_id
      where tm.user_id = p_user_id
  ),
  results as (
    select res.*, m.status as match_status
    from rjnx.match_results res
    join rjnx.matches m on m.id = res.match_id
    where res.participant_id in (select id from my_parts) and res.is_verified
  )
  select jsonb_build_object(
    'registered_tournaments', (select count(*) from my_regs),
    'tournaments_played', (select count(distinct r.tournament_id)
                            from rjnx.tournament_registrations r
                            join rjnx.matches m on m.tournament_id = r.tournament_id
                            where r.user_id = p_user_id and m.status = 'verified'),
    'completed_matches', (select count(*) from results),
    'wins', (select count(*) from results where placement = 1),
    'losses', (select count(*) from results where placement is not null and placement > 1),
    'total_kills', coalesce((select sum(kills) from results), 0),
    'total_earnings', coalesce((select p.total_earnings from rjnx.profiles p where p.id = p_user_id), 0),
    'global_rank', (
      select rnk from (
        select user_id, row_number() over (
          order by sum(total_points) desc, sum(total_kills) desc) as rnk
        from rjnx.leaderboard_entries
        where user_id is not null
        group by user_id
      ) t where t.user_id = p_user_id
    )
  );
$$;

create or replace function rjnx.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = rjnx, public as $$
begin
  if not rjnx.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users', (select count(*) from rjnx.profiles),
    'active_users', (select count(distinct user_id) from rjnx.notifications where created_at > now() - interval '30 days'),
    'total_tournaments', (select count(*) from rjnx.tournaments),
    'live_tournaments', (select count(*) from rjnx.tournaments where status = 'live'),
    'completed_tournaments', (select count(*) from rjnx.tournaments where status = 'completed'),
    'total_registrations', (select count(*) from rjnx.tournament_registrations),
    'pending_approvals', (select count(*) from rjnx.tournament_registrations where status = 'pending'),
    'total_revenue', (select coalesce(sum(amount), 0) from rjnx.payment_transactions where status = 'paid')
  );
end $$;

-- Keep tournament status honest as deadlines pass (cheap, idempotent).
create or replace function rjnx.refresh_tournament_statuses()
returns void
language sql security definer set search_path = rjnx, public as $$
  update rjnx.tournaments
     set status = 'registration_closed'
   where status = 'registration_open'
     and registration_ends_at is not null
     and registration_ends_at < now();

  update rjnx.tournaments
     set status = 'live'
   where status in ('registration_open','registration_closed','published')
     and starts_at <= now()
     and (ends_at is null or ends_at > now());

  update rjnx.tournaments
     set status = 'completed'
   where status = 'live' and ends_at is not null and ends_at < now();
$$;

-- Also expose global leaderboard (verified results across tournaments).
create or replace view rjnx.global_leaderboard
with (security_invoker = true) as
select
  coalesce(l.team_id, l.user_id) as owner_id,
  l.team_id,
  l.user_id,
  sum(l.total_points)::int as total_points,
  sum(l.total_kills)::int as total_kills,
  sum(l.wins)::int as wins,
  count(distinct l.tournament_id)::int as tournaments,
  min(l.best_placement) as best_placement
from rjnx.leaderboard_entries l
group by coalesce(l.team_id, l.user_id), l.team_id, l.user_id;

-- Explicit grants on function execution
grant execute on function rjnx.current_roles() to anon, authenticated;
grant execute on function rjnx.has_role(text) to anon, authenticated;
grant execute on function rjnx.is_staff() to anon, authenticated;
grant execute on function rjnx.is_super_admin() to anon, authenticated;
grant execute on function rjnx.can_manage_tournaments() to anon, authenticated;
grant execute on function rjnx.is_active_user() to anon, authenticated;
grant execute on function rjnx.register_for_tournament(uuid, uuid) to authenticated;
grant execute on function rjnx.cancel_registration(uuid) to authenticated;
grant execute on function rjnx.match_room_credentials(uuid) to authenticated;
grant execute on function rjnx.player_stats(uuid) to authenticated;
grant execute on function rjnx.admin_stats() to authenticated;
grant execute on function rjnx.recalculate_leaderboard(uuid) to authenticated;
grant execute on function rjnx.notify(uuid, rjnx.notification_type, text, text, text) to authenticated;
grant execute on function rjnx.log_audit(text, text, text, jsonb) to authenticated;
