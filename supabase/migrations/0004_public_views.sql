-- =====================================================================
-- RJNX GAMING ESPORTS — 0004 public aggregate views
-- Aggregates that must be consistent for every visitor (slot occupancy,
-- platform counters) are exposed through owner-privileged views so RLS on
-- the underlying rows never leaks private data.
-- =====================================================================

create or replace view rjnx.tournament_slot_counts
with (security_invoker = false) as
select
  r.tournament_id,
  count(*) filter (where r.status in ('pending', 'approved'))::int as taken,
  count(*) filter (where r.status = 'approved')::int as approved,
  count(*) filter (where r.status = 'pending')::int as pending
from rjnx.tournament_registrations r
group by r.tournament_id;

revoke all on rjnx.tournament_slot_counts from anon, authenticated;
grant select on rjnx.tournament_slot_counts to anon, authenticated;

create or replace view rjnx.public_player_stats
with (security_invoker = false) as
select
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.country,
  p.state,
  p.in_game_name,
  p.created_at,
  coalesce(l.total_points, 0)::int as total_points,
  coalesce(l.total_kills, 0)::int as total_kills,
  coalesce(l.wins, 0)::int as wins,
  coalesce(l.tournaments, 0)::int as tournaments_played,
  l.rank
from rjnx.profiles p
left join (
  select
    le.user_id,
    sum(le.total_points) as total_points,
    sum(le.total_kills) as total_kills,
    sum(le.wins) as wins,
    count(distinct le.tournament_id) as tournaments,
    row_number() over (order by sum(le.total_points) desc, sum(le.total_kills) desc) as rank
  from rjnx.leaderboard_entries le
  where le.user_id is not null
  group by le.user_id
) l on l.user_id = p.id
where p.is_suspended = false;

revoke all on rjnx.public_player_stats from anon, authenticated;
grant select on rjnx.public_player_stats to anon, authenticated;

create or replace view rjnx.public_team_stats
with (security_invoker = false) as
select
  t.id,
  t.name,
  t.tag,
  t.logo_url,
  t.game_id,
  t.captain_id,
  t.created_at,
  (select count(*)::int from rjnx.team_members tm where tm.team_id = t.id) as member_count,
  coalesce(l.total_points, 0)::int as total_points,
  coalesce(l.wins, 0)::int as wins,
  coalesce(l.tournaments, 0)::int as tournaments_played
from rjnx.teams t
left join (
  select
    le.team_id,
    sum(le.total_points) as total_points,
    sum(le.wins) as wins,
    count(distinct le.tournament_id) as tournaments
  from rjnx.leaderboard_entries le
  where le.team_id is not null
  group by le.team_id
) l on l.team_id = t.id
where t.is_active = true;

revoke all on rjnx.public_team_stats from anon, authenticated;
grant select on rjnx.public_team_stats to anon, authenticated;

-- Platform-wide counters for the public home page (no user data).
create or replace view rjnx.public_platform_stats
with (security_invoker = false) as
select
  (select count(*)::int from rjnx.tournaments where status <> 'draft') as total_tournaments,
  (select count(*)::int from rjnx.profiles where is_suspended = false) as total_players,
  (select count(*)::int from rjnx.teams where is_active = true) as total_teams,
  (select coalesce(sum(prize_pool), 0)::bigint from rjnx.tournaments where status <> 'draft') as total_prize_pool,
  (select count(*)::int from rjnx.tournaments where status = 'live') as live_tournaments;

revoke all on rjnx.public_platform_stats from anon, authenticated;
grant select on rjnx.public_platform_stats to anon, authenticated;
