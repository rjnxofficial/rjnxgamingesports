-- =====================================================================
-- RJNX GAMING ESPORTS — 0001 core schema
-- Schema: rjnx  (self-contained; does not touch any existing public tables)
-- Safe to re-run: every object is created with IF NOT EXISTS guards.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create schema if not exists rjnx;

-- ---------------------------------------------------------------- enums
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'user_role' and n.nspname = 'rjnx') then
    create type rjnx.user_role as enum ('super_admin','admin','tournament_manager','moderator','player');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'game_mode' and n.nspname = 'rjnx') then
    create type rjnx.game_mode as enum ('solo','duo','squad');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tournament_format' and n.nspname = 'rjnx') then
    create type rjnx.tournament_format as enum
      ('single_elimination','double_elimination','round_robin','league','battle_royale','custom');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tournament_status' and n.nspname = 'rjnx') then
    create type rjnx.tournament_status as enum
      ('draft','published','registration_open','registration_closed','live','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'match_status' and n.nspname = 'rjnx') then
    create type rjnx.match_status as enum
      ('scheduled','room_published','live','awaiting_verification','verified','disputed','cancelled');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'registration_status' and n.nspname = 'rjnx') then
    create type rjnx.registration_status as enum ('pending','approved','rejected','cancelled','waitlisted');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'payment_status' and n.nspname = 'rjnx') then
    create type rjnx.payment_status as enum ('created','pending','paid','failed','refunded');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'support_status' and n.nspname = 'rjnx') then
    create type rjnx.support_status as enum ('open','in_progress','resolved','closed');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'invitation_status' and n.nspname = 'rjnx') then
    create type rjnx.invitation_status as enum ('pending','accepted','rejected','cancelled');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'notification_type' and n.nspname = 'rjnx') then
    create type rjnx.notification_type as enum
      ('registration','approval','match','room','result','winner','team','announcement','admin','payment','system');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'team_member_role' and n.nspname = 'rjnx') then
    create type rjnx.team_member_role as enum ('captain','member','substitute');
  end if;
end $$;

-- ------------------------------------------------------------- helpers
create or replace function rjnx.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------ profiles
create table if not exists rjnx.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  full_name text,
  email citext,
  phone text,
  country text,
  state text,
  avatar_url text,
  bio text,
  in_game_name text,
  game_uid text,
  primary_game_id uuid,
  is_suspended boolean not null default false,
  suspended_reason text,
  total_earnings numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_.]{3,24}$'),
  constraint profiles_earnings_positive check (total_earnings >= 0)
);
create index if not exists profiles_username_idx on rjnx.profiles (username);
create index if not exists profiles_primary_game_idx on rjnx.profiles (primary_game_id);
create index if not exists profiles_suspended_idx on rjnx.profiles (is_suspended) where is_suspended;

drop trigger if exists trg_profiles_touch on rjnx.profiles;
create trigger trg_profiles_touch before update on rjnx.profiles
  for each row execute function rjnx.touch_updated_at();

-- ------------------------------------------------------------ user_roles
create table if not exists rjnx.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role rjnx.user_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_idx on rjnx.user_roles (user_id);
create index if not exists user_roles_role_idx on rjnx.user_roles (role);

-- ----------------------------------------------------------------- games
create table if not exists rjnx.games (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  short_name text not null,
  cover_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_games_touch on rjnx.games;
create trigger trg_games_touch before update on rjnx.games
  for each row execute function rjnx.touch_updated_at();

alter table rjnx.profiles
  drop constraint if exists profiles_primary_game_fk;
alter table rjnx.profiles
  add constraint profiles_primary_game_fk foreign key (primary_game_id)
  references rjnx.games(id) on delete set null;

-- -------------------------------------------------------- scoring_rules
create table if not exists rjnx.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_id uuid references rjnx.games(id) on delete set null,
  placement_points jsonb not null default '[{"placement":1,"points":12},{"placement":2,"points":9},{"placement":3,"points":7},{"placement":4,"points":5},{"placement":5,"points":4},{"placement":6,"points":3},{"placement":7,"points":2},{"placement":8,"points":1}]'::jsonb,
  kill_points integer not null default 1,
  bonus_rules jsonb,
  tie_breakers text[] not null default array['total_points','kills','best_placement'],
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scoring_kill_points_positive check (kill_points >= 0),
  constraint scoring_placement_is_array check (jsonb_typeof(placement_points) = 'array')
);
drop trigger if exists trg_scoring_rules_touch on rjnx.scoring_rules;
create trigger trg_scoring_rules_touch before update on rjnx.scoring_rules
  for each row execute function rjnx.touch_updated_at();

-- ---------------------------------------------------------- tournaments
create table if not exists rjnx.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  game_id uuid not null references rjnx.games(id) on delete restrict,
  mode rjnx.game_mode not null default 'squad',
  format rjnx.tournament_format not null default 'single_elimination',
  description text,
  rules text,
  banner_url text,
  entry_fee numeric(10,2) not null default 0,
  prize_pool numeric(12,2) not null default 0,
  prize_distribution jsonb not null default '[]'::jsonb,
  max_slots integer not null default 64,
  min_team_size integer not null default 1,
  max_team_size integer not null default 4,
  registration_starts_at timestamptz,
  registration_ends_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status rjnx.tournament_status not null default 'draft',
  is_featured boolean not null default false,
  requires_approval boolean not null default false,
  scoring_rule_id uuid references rjnx.scoring_rules(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_fee_positive check (entry_fee >= 0),
  constraint tournaments_prize_positive check (prize_pool >= 0),
  constraint tournaments_slots_range check (max_slots between 2 and 4096),
  constraint tournaments_team_size_range check (
    min_team_size between 1 and 8 and max_team_size between 1 and 8 and max_team_size >= min_team_size
  ),
  constraint tournaments_dates_order check (
    (registration_ends_at is null or registration_starts_at is null or registration_ends_at > registration_starts_at)
    and (registration_ends_at is null or registration_ends_at <= starts_at)
    and (ends_at is null or ends_at >= starts_at)
  ),
  constraint tournaments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index if not exists tournaments_game_idx on rjnx.tournaments (game_id);
create index if not exists tournaments_status_idx on rjnx.tournaments (status);
create index if not exists tournaments_starts_idx on rjnx.tournaments (starts_at desc);
create index if not exists tournaments_featured_idx on rjnx.tournaments (is_featured) where is_featured;
drop trigger if exists trg_tournaments_touch on rjnx.tournaments;
create trigger trg_tournaments_touch before update on rjnx.tournaments
  for each row execute function rjnx.touch_updated_at();

-- ---------------------------------------------------------------- teams
create table if not exists rjnx.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text,
  logo_url text,
  game_id uuid references rjnx.games(id) on delete set null,
  captain_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_len check (char_length(name) between 3 and 40),
  constraint teams_tag_len check (tag is null or char_length(tag) <= 6)
);
create unique index if not exists teams_name_unique_idx on rjnx.teams (lower(name));
create index if not exists teams_captain_idx on rjnx.teams (captain_id);
drop trigger if exists trg_teams_touch on rjnx.teams;
create trigger trg_teams_touch before update on rjnx.teams
  for each row execute function rjnx.touch_updated_at();

create table if not exists rjnx.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references rjnx.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role rjnx.team_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
create index if not exists team_members_user_idx on rjnx.team_members (user_id);
create unique index if not exists team_members_one_team_per_user
  on rjnx.team_members (user_id);

create table if not exists rjnx.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references rjnx.teams(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status rjnx.invitation_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint team_inv_no_self check (inviter_id <> invitee_id)
);
create unique index if not exists team_invitations_pending_unique
  on rjnx.team_invitations (team_id, invitee_id) where status = 'pending';
create index if not exists team_invitations_invitee_idx on rjnx.team_invitations (invitee_id, status);

-- ------------------------------------------------------- registrations
create table if not exists rjnx.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references rjnx.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references rjnx.teams(id) on delete set null,
  status rjnx.registration_status not null default 'pending',
  seed integer,
  slot_number integer,
  notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  payment_status rjnx.payment_status not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one live registration per player per tournament
create unique index if not exists registrations_unique_player
  on rjnx.tournament_registrations (tournament_id, user_id)
  where status in ('pending','approved','waitlisted');
create unique index if not exists registrations_unique_team
  on rjnx.tournament_registrations (tournament_id, team_id)
  where team_id is not null and status in ('pending','approved','waitlisted');
create index if not exists registrations_tournament_idx on rjnx.tournament_registrations (tournament_id, status);
create index if not exists registrations_user_idx on rjnx.tournament_registrations (user_id);
create index if not exists registrations_team_idx on rjnx.tournament_registrations (team_id);
drop trigger if exists trg_registrations_touch on rjnx.tournament_registrations;
create trigger trg_registrations_touch before update on rjnx.tournament_registrations
  for each row execute function rjnx.touch_updated_at();

-- -------------------------------------------------------------- matches
create table if not exists rjnx.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references rjnx.tournaments(id) on delete cascade,
  round integer not null default 1 check (round between 1 and 50),
  group_label text,
  match_number integer not null default 1 check (match_number between 1 and 500),
  bracket_position integer,
  next_match_id uuid references rjnx.matches(id) on delete set null,
  scheduled_at timestamptz,
  room_id text,
  room_password text,
  room_published_at timestamptz,
  status rjnx.match_status not null default 'scheduled',
  map_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round, match_number)
);
create index if not exists matches_tournament_idx on rjnx.matches (tournament_id, round, match_number);
create index if not exists matches_status_idx on rjnx.matches (status);
create index if not exists matches_scheduled_idx on rjnx.matches (scheduled_at);
drop trigger if exists trg_matches_touch on rjnx.matches;
create trigger trg_matches_touch before update on rjnx.matches
  for each row execute function rjnx.touch_updated_at();

create table if not exists rjnx.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references rjnx.matches(id) on delete cascade,
  registration_id uuid references rjnx.tournament_registrations(id) on delete cascade,
  team_id uuid references rjnx.teams(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  slot integer,
  eliminated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, registration_id)
);
create index if not exists match_participants_match_idx on rjnx.match_participants (match_id);
create index if not exists match_participants_team_idx on rjnx.match_participants (team_id);
create index if not exists match_participants_user_idx on rjnx.match_participants (user_id);

create table if not exists rjnx.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references rjnx.matches(id) on delete cascade,
  participant_id uuid not null references rjnx.match_participants(id) on delete cascade,
  placement integer,
  kills integer not null default 0,
  placement_points integer not null default 0,
  kill_points integer not null default 0,
  bonus_points integer not null default 0,
  total_points integer not null default 0,
  evidence_url text,
  submitted_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, participant_id),
  constraint results_kills_positive check (kills >= 0),
  constraint results_placement_positive check (placement is null or placement > 0),
  constraint results_total_matches_parts check (
    total_points = placement_points + kill_points + bonus_points
  )
);
create index if not exists match_results_match_idx on rjnx.match_results (match_id);
create index if not exists match_results_participant_idx on rjnx.match_results (participant_id);
create index if not exists match_results_verified_idx on rjnx.match_results (is_verified);
drop trigger if exists trg_match_results_touch on rjnx.match_results;
create trigger trg_match_results_touch before update on rjnx.match_results
  for each row execute function rjnx.touch_updated_at();

-- ---------------------------------------------------------- leaderboard
create table if not exists rjnx.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references rjnx.tournaments(id) on delete cascade,
  team_id uuid references rjnx.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  matches_played integer not null default 0,
  total_kills integer not null default 0,
  total_points integer not null default 0,
  wins integer not null default 0,
  best_placement integer,
  rank integer,
  updated_at timestamptz not null default now(),
  constraint leaderboard_has_owner check (team_id is not null or user_id is not null)
);
create unique index if not exists leaderboard_unique_team
  on rjnx.leaderboard_entries (tournament_id, team_id) where team_id is not null;
create unique index if not exists leaderboard_unique_user
  on rjnx.leaderboard_entries (tournament_id, user_id) where team_id is null;
create index if not exists leaderboard_tournament_idx on rjnx.leaderboard_entries (tournament_id, rank);

-- --------------------------------------------------------- notifications
create table if not exists rjnx.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type rjnx.notification_type not null default 'system',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on rjnx.notifications (user_id, is_read, created_at desc);

create table if not exists rjnx.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on rjnx.push_tokens (user_id);

-- ----------------------------------------------------------- news/banners
create table if not exists rjnx.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  excerpt text,
  content text not null,
  cover_url text,
  author_id uuid references auth.users(id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create index if not exists news_published_idx on rjnx.news_articles (is_published, published_at desc);
drop trigger if exists trg_news_touch on rjnx.news_articles;
create trigger trg_news_touch before update on rjnx.news_articles
  for each row execute function rjnx.touch_updated_at();

create table if not exists rjnx.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  placement text not null default 'home_hero',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists banners_placement_idx on rjnx.banners (placement, is_active, sort_order);

-- ---------------------------------------------------- settings + audit
create table if not exists rjnx.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists rjnx.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on rjnx.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_entity_idx on rjnx.audit_logs (entity_type, entity_id);

create table if not exists rjnx.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  category text not null default 'other',
  status rjnx.support_status not null default 'open',
  admin_reply text,
  replied_by uuid references auth.users(id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on rjnx.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on rjnx.support_tickets (status, created_at desc);
drop trigger if exists trg_support_touch on rjnx.support_tickets;
create trigger trg_support_touch before update on rjnx.support_tickets
  for each row execute function rjnx.touch_updated_at();

-- ------------------------------------------- payment architecture (opt-in)
create table if not exists rjnx.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid references rjnx.tournaments(id) on delete set null,
  registration_id uuid references rjnx.tournament_registrations(id) on delete set null,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status rjnx.payment_status not null default 'created',
  receipt text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_amount_positive check (amount >= 0)
);
create unique index if not exists payment_provider_payment_unique
  on rjnx.payment_transactions (provider, provider_payment_id) where provider_payment_id is not null;
create index if not exists payment_user_idx on rjnx.payment_transactions (user_id, created_at desc);
create index if not exists payment_status_idx on rjnx.payment_transactions (status);
drop trigger if exists trg_payment_touch on rjnx.payment_transactions;
create trigger trg_payment_touch before update on rjnx.payment_transactions
  for each row execute function rjnx.touch_updated_at();
