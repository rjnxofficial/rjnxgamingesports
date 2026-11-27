-- =====================================================================
-- RJNX GAMING ESPORTS — 0003 Row Level Security
-- Every table in rjnx is locked down; column-level privileges keep
-- room credentials private even for eligible participants.
-- =====================================================================

alter table rjnx.profiles enable row level security;
alter table rjnx.user_roles enable row level security;
alter table rjnx.games enable row level security;
alter table rjnx.scoring_rules enable row level security;
alter table rjnx.tournaments enable row level security;
alter table rjnx.teams enable row level security;
alter table rjnx.team_members enable row level security;
alter table rjnx.team_invitations enable row level security;
alter table rjnx.tournament_registrations enable row level security;
alter table rjnx.matches enable row level security;
alter table rjnx.match_participants enable row level security;
alter table rjnx.match_results enable row level security;
alter table rjnx.leaderboard_entries enable row level security;
alter table rjnx.notifications enable row level security;
alter table rjnx.push_tokens enable row level security;
alter table rjnx.news_articles enable row level security;
alter table rjnx.banners enable row level security;
alter table rjnx.platform_settings enable row level security;
alter table rjnx.audit_logs enable row level security;
alter table rjnx.support_tickets enable row level security;
alter table rjnx.payment_transactions enable row level security;

-- ---------------------------------------------------------------- profiles
drop policy if exists profiles_select on rjnx.profiles;
create policy profiles_select on rjnx.profiles
  for select using (true);  -- public player directory (no secrets in this table)

drop policy if exists profiles_update_own on rjnx.profiles;
create policy profiles_update_own on rjnx.profiles
  for update using (auth.uid() = id or rjnx.is_staff())
  with check (auth.uid() = id or rjnx.is_super_admin());

drop policy if exists profiles_insert_self on rjnx.profiles;
create policy profiles_insert_self on rjnx.profiles
  for insert with check (auth.uid() = id);

-- -------------------------------------------------------------- user_roles
drop policy if exists user_roles_select on rjnx.user_roles;
create policy user_roles_select on rjnx.user_roles
  for select using (auth.uid() = user_id or rjnx.is_staff());

drop policy if exists user_roles_super_admin_write on rjnx.user_roles;
create policy user_roles_super_admin_write on rjnx.user_roles
  for all using (rjnx.is_super_admin()) with check (rjnx.is_super_admin());

-- ------------------------------------------------------------------- games
drop policy if exists games_select on rjnx.games;
create policy games_select on rjnx.games for select using (true);

drop policy if exists games_staff_write on rjnx.games;
create policy games_staff_write on rjnx.games
  for all using (rjnx.is_super_admin()) with check (rjnx.is_super_admin());

-- ---------------------------------------------------------- scoring_rules
drop policy if exists scoring_rules_select on rjnx.scoring_rules;
create policy scoring_rules_select on rjnx.scoring_rules for select using (true);

drop policy if exists scoring_rules_staff_write on rjnx.scoring_rules;
create policy scoring_rules_staff_write on rjnx.scoring_rules
  for all using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

-- ------------------------------------------------------------ tournaments
drop policy if exists tournaments_select_public on rjnx.tournaments;
create policy tournaments_select_public on rjnx.tournaments
  for select using (status <> 'draft' or rjnx.is_staff());

drop policy if exists tournaments_staff_insert on rjnx.tournaments;
create policy tournaments_staff_insert on rjnx.tournaments
  for insert with check (rjnx.can_manage_tournaments());

drop policy if exists tournaments_staff_update on rjnx.tournaments;
create policy tournaments_staff_update on rjnx.tournaments
  for update using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

drop policy if exists tournaments_super_admin_delete on rjnx.tournaments;
create policy tournaments_super_admin_delete on rjnx.tournaments
  for delete using (rjnx.is_super_admin());

-- ------------------------------------------------------------------- teams
drop policy if exists teams_select on rjnx.teams;
create policy teams_select on rjnx.teams for select using (true);

drop policy if exists teams_insert on rjnx.teams;
create policy teams_insert on rjnx.teams
  for insert with check (auth.uid() = captain_id and rjnx.is_active_user());

drop policy if exists teams_update on rjnx.teams;
create policy teams_update on rjnx.teams
  for update using (auth.uid() = captain_id or rjnx.is_staff())
  with check (auth.uid() = captain_id or rjnx.is_staff());

drop policy if exists teams_delete on rjnx.teams;
create policy teams_delete on rjnx.teams
  for delete using (auth.uid() = captain_id or rjnx.is_super_admin());

-- ------------------------------------------------------------ team_members
drop policy if exists team_members_select on rjnx.team_members;
create policy team_members_select on rjnx.team_members for select using (true);

drop policy if exists team_members_insert on rjnx.team_members;
create policy team_members_insert on rjnx.team_members
  for insert with check (
    exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
    or rjnx.is_staff()
  );

drop policy if exists team_members_delete on rjnx.team_members;
create policy team_members_delete on rjnx.team_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
    or rjnx.is_staff()
  );

drop policy if exists team_members_update on rjnx.team_members;
create policy team_members_update on rjnx.team_members
  for update using (
    exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
    or rjnx.is_staff()
  ) with check (
    exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
    or rjnx.is_staff()
  );

-- -------------------------------------------------------- team_invitations
drop policy if exists team_invitations_select on rjnx.team_invitations;
create policy team_invitations_select on rjnx.team_invitations
  for select using (
    invitee_id = auth.uid() or inviter_id = auth.uid() or rjnx.is_staff()
    or exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
  );

drop policy if exists team_invitations_insert on rjnx.team_invitations;
create policy team_invitations_insert on rjnx.team_invitations
  for insert with check (
    inviter_id = auth.uid()
    and exists (select 1 from rjnx.teams t where t.id = team_id and t.captain_id = auth.uid())
  );

drop policy if exists team_invitations_update on rjnx.team_invitations;
create policy team_invitations_update on rjnx.team_invitations
  for update using (invitee_id = auth.uid() or inviter_id = auth.uid())
  with check (invitee_id = auth.uid() or inviter_id = auth.uid());

-- -------------------------------------------------------- registrations
drop policy if exists registrations_select on rjnx.tournament_registrations;
create policy registrations_select on rjnx.tournament_registrations
  for select using (
    user_id = auth.uid()
    or rjnx.is_staff()
    or (
      team_id is not null
      and exists (select 1 from rjnx.team_members tm where tm.team_id = team_id and tm.user_id = auth.uid())
    )
    or status = 'approved'  -- public participants list (non-sensitive columns only)
  );

-- Writes happen through SECURITY DEFINER functions (register_for_tournament /
-- cancel_registration) so eligibility, slot limits and duplicate rules are
-- enforced transactionally. Staff may still review registrations directly.
drop policy if exists registrations_staff_update on rjnx.tournament_registrations;
create policy registrations_staff_update on rjnx.tournament_registrations
  for update using (rjnx.is_staff()) with check (rjnx.is_staff());

drop policy if exists registrations_staff_insert on rjnx.tournament_registrations;
create policy registrations_staff_insert on rjnx.tournament_registrations
  for insert with check (rjnx.is_staff());

drop policy if exists registrations_staff_delete on rjnx.tournament_registrations;
create policy registrations_staff_delete on rjnx.tournament_registrations
  for delete using (rjnx.is_super_admin());

-- ---------------------------------------------------------------- matches
-- Room credentials are stripped through column privileges below, so the row
-- itself can be read by participants for scheduling purposes.
drop policy if exists matches_select on rjnx.matches;
create policy matches_select on rjnx.matches
  for select using (
    rjnx.is_staff()
    or exists (
      select 1 from rjnx.tournament_registrations r
      where r.tournament_id = matches.tournament_id
        and r.user_id = auth.uid()
        and r.status in ('pending','approved','waitlisted')
    )
    or exists (
      select 1 from rjnx.tournament_registrations r
      where r.tournament_id = matches.tournament_id
        and r.status = 'approved'
        and r.team_id is not null
        and exists (select 1 from rjnx.team_members tm where tm.team_id = r.team_id and tm.user_id = auth.uid())
    )
    or exists (
      select 1 from rjnx.tournaments t
      where t.id = matches.tournament_id
        and t.status in ('registration_open','registration_closed','live','completed')
    )
  );

drop policy if exists matches_staff_write on rjnx.matches;
create policy matches_staff_write on rjnx.matches
  for all using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

-- ------------------------------------------------------- match_participants
drop policy if exists match_participants_select on rjnx.match_participants;
create policy match_participants_select on rjnx.match_participants
  for select using (
    rjnx.is_staff()
    or user_id = auth.uid()
    or (team_id is not null and exists (
      select 1 from rjnx.team_members tm where tm.team_id = match_participants.team_id and tm.user_id = auth.uid()
    ))
    or exists (
      select 1 from rjnx.matches m join rjnx.tournaments t on t.id = m.tournament_id
      where m.id = match_participants.match_id and t.status in ('live','completed')
    )
  );

drop policy if exists match_participants_staff_write on rjnx.match_participants;
create policy match_participants_staff_write on rjnx.match_participants
  for all using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

-- ------------------------------------------------------------ match_results
drop policy if exists match_results_select on rjnx.match_results;
create policy match_results_select on rjnx.match_results
  for select using (
    rjnx.is_staff()
    or is_verified
    or exists (
      select 1 from rjnx.match_participants mp
      where mp.id = match_results.participant_id
        and (mp.user_id = auth.uid()
             or (mp.team_id is not null and exists (
               select 1 from rjnx.team_members tm where tm.team_id = mp.team_id and tm.user_id = auth.uid())))
    )
  );

-- Players may submit (not verify) their own result rows.
drop policy if exists match_results_insert on rjnx.match_results;
create policy match_results_insert on rjnx.match_results
  for insert with check (
    is_verified = false
    and submitted_by = auth.uid()
    and exists (
      select 1 from rjnx.match_participants mp
      where mp.id = participant_id
        and (mp.user_id = auth.uid()
             or (mp.team_id is not null and exists (
               select 1 from rjnx.team_members tm where tm.team_id = mp.team_id and tm.user_id = auth.uid())))
    )
  );

drop policy if exists match_results_staff_write on rjnx.match_results;
create policy match_results_staff_write on rjnx.match_results
  for update using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

drop policy if exists match_results_staff_delete on rjnx.match_results;
create policy match_results_staff_delete on rjnx.match_results
  for delete using (rjnx.is_staff());

-- ------------------------------------------------------ leaderboard_entries
drop policy if exists leaderboard_select on rjnx.leaderboard_entries;
create policy leaderboard_select on rjnx.leaderboard_entries for select using (true);

drop policy if exists leaderboard_staff_write on rjnx.leaderboard_entries;
create policy leaderboard_staff_write on rjnx.leaderboard_entries
  for all using (rjnx.can_manage_tournaments()) with check (rjnx.can_manage_tournaments());

-- ---------------------------------------------------------- notifications
drop policy if exists notifications_select_own on rjnx.notifications;
create policy notifications_select_own on rjnx.notifications
  for select using (user_id = auth.uid() or rjnx.is_staff());

drop policy if exists notifications_update_own on rjnx.notifications;
create policy notifications_update_own on rjnx.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_staff_insert on rjnx.notifications;
create policy notifications_staff_insert on rjnx.notifications
  for insert with check (rjnx.is_staff());

drop policy if exists notifications_own_delete on rjnx.notifications;
create policy notifications_own_delete on rjnx.notifications
  for delete using (user_id = auth.uid());

-- ------------------------------------------------------------ push_tokens
drop policy if exists push_tokens_own on rjnx.push_tokens;
create policy push_tokens_own on rjnx.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------- news_articles
drop policy if exists news_select on rjnx.news_articles;
create policy news_select on rjnx.news_articles
  for select using (is_published or rjnx.is_staff());

drop policy if exists news_staff_write on rjnx.news_articles;
create policy news_staff_write on rjnx.news_articles
  for all using (rjnx.is_staff()) with check (rjnx.is_staff());

-- ---------------------------------------------------------------- banners
drop policy if exists banners_select on rjnx.banners;
create policy banners_select on rjnx.banners for select using (is_active or rjnx.is_staff());

drop policy if exists banners_staff_write on rjnx.banners;
create policy banners_staff_write on rjnx.banners
  for all using (rjnx.is_staff()) with check (rjnx.is_staff());

-- ------------------------------------------------------ platform_settings
drop policy if exists platform_settings_select on rjnx.platform_settings;
create policy platform_settings_select on rjnx.platform_settings for select using (true);

drop policy if exists platform_settings_super_admin_write on rjnx.platform_settings;
create policy platform_settings_super_admin_write on rjnx.platform_settings
  for all using (rjnx.is_super_admin()) with check (rjnx.is_super_admin());

-- ------------------------------------------------------------- audit_logs
drop policy if exists audit_logs_select on rjnx.audit_logs;
create policy audit_logs_select on rjnx.audit_logs
  for select using (rjnx.is_super_admin());

drop policy if exists audit_logs_insert on rjnx.audit_logs;
create policy audit_logs_insert on rjnx.audit_logs
  for insert with check (actor_id = auth.uid() or actor_id is null);

-- --------------------------------------------------------- support_tickets
drop policy if exists support_tickets_select on rjnx.support_tickets;
create policy support_tickets_select on rjnx.support_tickets
  for select using (user_id = auth.uid() or rjnx.is_staff());

drop policy if exists support_tickets_insert on rjnx.support_tickets;
create policy support_tickets_insert on rjnx.support_tickets
  for insert with check (user_id = auth.uid() and rjnx.is_active_user());

drop policy if exists support_tickets_staff_update on rjnx.support_tickets;
create policy support_tickets_staff_update on rjnx.support_tickets
  for update using (rjnx.is_staff()) with check (rjnx.is_staff());

-- ---------------------------------------------------- payment_transactions
drop policy if exists payment_select on rjnx.payment_transactions;
create policy payment_select on rjnx.payment_transactions
  for select using (user_id = auth.uid() or rjnx.is_staff());

drop policy if exists payment_staff_write on rjnx.payment_transactions;
create policy payment_staff_write on rjnx.payment_transactions
  for all using (rjnx.is_staff()) with check (rjnx.is_staff());

-- =====================================================================
-- Column-level privileges: never expose room credentials on the base table.
-- =====================================================================
revoke all on rjnx.matches from anon, authenticated;
grant select (
  id, tournament_id, round, group_label, match_number, bracket_position,
  next_match_id, scheduled_at, room_published_at, status, map_name,
  created_at, updated_at
) on rjnx.matches to anon, authenticated;
grant insert, update, delete on rjnx.matches to authenticated;

revoke all on rjnx.profiles from anon, authenticated;
grant select (
  id, username, full_name, avatar_url, bio, country, state, in_game_name,
  primary_game_id, total_earnings, is_suspended, created_at, updated_at
) on rjnx.profiles to anon;
grant select (
  id, username, full_name, email, phone, avatar_url, bio, country, state,
  in_game_name, game_uid, primary_game_id, total_earnings, is_suspended,
  suspended_reason, created_at, updated_at
) on rjnx.profiles to authenticated;
grant update (
  username, full_name, phone, country, state, avatar_url, bio,
  in_game_name, game_uid, primary_game_id
) on rjnx.profiles to authenticated;
grant insert on rjnx.profiles to authenticated;

revoke all on rjnx.tournament_registrations from anon, authenticated;
grant select on rjnx.tournament_registrations to authenticated;
grant insert, update, delete on rjnx.tournament_registrations to authenticated;

revoke all on rjnx.user_roles from anon, authenticated;
grant select on rjnx.user_roles to authenticated;

revoke all on rjnx.audit_logs from anon, authenticated;
grant select, insert on rjnx.audit_logs to authenticated;

revoke all on rjnx.support_tickets from anon, authenticated;
grant select, insert, update on rjnx.support_tickets to authenticated;

revoke all on rjnx.team_invitations from anon, authenticated;
grant select, insert, update, delete on rjnx.team_invitations to authenticated;

revoke all on rjnx.match_results from anon, authenticated;
grant select, insert, update, delete on rjnx.match_results to authenticated;

revoke all on rjnx.notifications from anon, authenticated;
grant select, update, delete, insert on rjnx.notifications to authenticated;

revoke all on rjnx.payment_transactions from anon, authenticated;
grant select, insert, update on rjnx.payment_transactions to authenticated;

grant select on rjnx.games, rjnx.scoring_rules, rjnx.tournaments, rjnx.teams,
  rjnx.team_members, rjnx.match_participants, rjnx.leaderboard_entries,
  rjnx.news_articles, rjnx.banners, rjnx.platform_settings, rjnx.global_leaderboard
  to anon, authenticated;

grant insert, update, delete on rjnx.teams, rjnx.team_members to authenticated;
grant insert, update, delete on rjnx.games, rjnx.scoring_rules, rjnx.tournaments,
  rjnx.leaderboard_entries, rjnx.news_articles, rjnx.banners, rjnx.platform_settings
  to authenticated;
grant insert, update, delete on rjnx.match_participants to authenticated;
