/** Row-level TypeScript types mirroring the `rjnx` PostgreSQL schema. */

import type {
  GameMode,
  MatchStatus,
  NotificationType,
  PaymentStatus,
  RegistrationStatus,
  Role,
  SupportStatus,
  TournamentFormat,
  TournamentStatus,
} from "./constants";

export type UUID = string;
export type ISODateString = string;

export interface Profile {
  id: UUID;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  avatar_url: string | null;
  bio: string | null;
  in_game_name: string | null;
  game_uid: string | null;
  primary_game_id: UUID | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  total_earnings: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface UserRole {
  id: UUID;
  user_id: UUID;
  role: Role;
  granted_by: UUID | null;
  created_at: ISODateString;
}

export interface Game {
  id: UUID;
  slug: string;
  name: string;
  short_name: string;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ScoringRule {
  id: UUID;
  name: string;
  game_id: UUID | null;
  /** array of { placement: number, points: number } */
  placement_points: { placement: number; points: number }[];
  kill_points: number;
  /** e.g. { "10+": 5 } style bonus table, stored as jsonb */
  bonus_rules: Record<string, number> | null;
  tie_breakers: ("total_points" | "kills" | "best_placement" | "wins")[];
  is_default: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Tournament {
  id: UUID;
  slug: string;
  name: string;
  game_id: UUID;
  mode: GameMode;
  format: TournamentFormat;
  description: string | null;
  rules: string | null;
  banner_url: string | null;
  entry_fee: number;
  prize_pool: number;
  prize_distribution: { place: number; amount: number; label?: string }[];
  max_slots: number;
  min_team_size: number;
  max_team_size: number;
  registration_starts_at: ISODateString | null;
  registration_ends_at: ISODateString | null;
  starts_at: ISODateString;
  ends_at: ISODateString | null;
  status: TournamentStatus;
  is_featured: boolean;
  requires_approval: boolean;
  scoring_rule_id: UUID | null;
  created_by: UUID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
  // joined
  game?: Game | null;
  registered_count?: number;
}

export interface Team {
  id: UUID;
  name: string;
  tag: string | null;
  logo_url: string | null;
  game_id: UUID | null;
  captain_id: UUID;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  members?: TeamMember[];
  member_count?: number;
}

export interface TeamMember {
  id: UUID;
  team_id: UUID;
  user_id: UUID;
  role: "captain" | "member" | "substitute";
  joined_at: ISODateString;
  profile?: Pick<Profile, "id" | "username" | "avatar_url" | "in_game_name"> | null;
}

export interface TeamInvitation {
  id: UUID;
  team_id: UUID;
  inviter_id: UUID;
  invitee_id: UUID;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string | null;
  created_at: ISODateString;
  responded_at: ISODateString | null;
}

export interface TournamentRegistration {
  id: UUID;
  tournament_id: UUID;
  user_id: UUID;
  team_id: UUID | null;
  status: RegistrationStatus;
  seed: number | null;
  slot_number: number | null;
  notes: string | null;
  reviewed_by: UUID | null;
  reviewed_at: ISODateString | null;
  payment_status: PaymentStatus;
  created_at: ISODateString;
  updated_at: ISODateString;
  tournament?: Tournament | null;
  team?: Team | null;
  profile?: Profile | null;
}

export interface Match {
  id: UUID;
  tournament_id: UUID;
  round: number;
  group_label: string | null;
  match_number: number;
  bracket_position: number | null;
  next_match_id: UUID | null;
  scheduled_at: ISODateString | null;
  room_id: string | null;
  room_password: string | null;
  room_published_at: ISODateString | null;
  status: MatchStatus;
  map_name: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
  tournament?: Tournament | null;
  // publicly safe projection
  room_details_visible?: boolean;
}

export interface MatchParticipant {
  id: UUID;
  match_id: UUID;
  registration_id: UUID | null;
  team_id: UUID | null;
  user_id: UUID | null;
  slot: number | null;
  eliminated: boolean;
  created_at: ISODateString;
}

export interface MatchResult {
  id: UUID;
  match_id: UUID;
  participant_id: UUID;
  placement: number | null;
  kills: number;
  placement_points: number;
  kill_points: number;
  bonus_points: number;
  total_points: number;
  evidence_url: string | null;
  submitted_by: UUID | null;
  verified_by: UUID | null;
  is_verified: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface LeaderboardEntry {
  id: UUID;
  tournament_id: UUID;
  team_id: UUID | null;
  user_id: UUID | null;
  matches_played: number;
  total_kills: number;
  total_points: number;
  wins: number;
  best_placement: number | null;
  rank: number | null;
  updated_at: ISODateString;
  team?: Team | null;
  profile?: Profile | null;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: ISODateString;
}

export interface NewsArticle {
  id: UUID;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  author_id: UUID | null;
  is_published: boolean;
  published_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Banner {
  id: UUID;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  placement: string;
  is_active: boolean;
  sort_order: number;
  created_at: ISODateString;
}

export interface PlatformSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: UUID | null;
  updated_at: ISODateString;
}

export interface AuditLog {
  id: UUID;
  actor_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: ISODateString;
  actor?: Pick<Profile, "id" | "username" | "avatar_url"> | null;
}

export interface SupportTicket {
  id: UUID;
  user_id: UUID;
  subject: string;
  message: string;
  category: string;
  status: SupportStatus;
  admin_reply: string | null;
  replied_by: UUID | null;
  replied_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
  profile?: Pick<Profile, "id" | "username" | "avatar_url"> | null;
}

export interface PaymentTransaction {
  id: UUID;
  user_id: UUID;
  tournament_id: UUID | null;
  registration_id: UUID | null;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receipt: string | null;
  notes: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface PlayerStats {
  tournaments_played: number;
  registered_tournaments: number;
  completed_matches: number;
  wins: number;
  losses: number;
  total_kills: number;
  total_earnings: number;
  global_rank: number | null;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_tournaments: number;
  live_tournaments: number;
  completed_tournaments: number;
  total_registrations: number;
  pending_approvals: number;
  total_revenue: number;
}

export interface Paginated<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; field?: string };
