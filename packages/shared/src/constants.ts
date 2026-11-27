/**
 * RJNX GAMING ESPORTS — domain constants & brand tokens.
 * Shared between the Next.js website and the Expo Android application.
 */

export const BRAND = {
  name: "RJNX GAMING ESPORTS",
  shortName: "RJNX",
  tagline: "BE SAVAGE. NOT AVERAGE.",
  developer: "DEVKAZZU",
  domain: "rjnxgamingesports.com",
} as const;

export const COLORS = {
  bg: "#05050A",
  bgAlt: "#0E0E16",
  electricBlue: "#00CFFF",
  cyberPurple: "#8B5CFF",
  plasmaPink: "#FF2ED1",
  laserRed: "#FF3B3B",
  text: "#FFFFFF",
} as const;

export const GAMES = [
  { slug: "free-fire", name: "Free Fire", short: "FF", maxTeamSize: 4 },
  { slug: "free-fire-max", name: "Free Fire MAX", short: "FF MAX", maxTeamSize: 4 },
  { slug: "bgmi", name: "BGMI", short: "BGMI", maxTeamSize: 4 },
  { slug: "pubg-mobile", name: "PUBG Mobile", short: "PUBGM", maxTeamSize: 4 },
  { slug: "call-of-duty-mobile", name: "Call of Duty Mobile", short: "CODM", maxTeamSize: 5 },
  { slug: "valorant", name: "Valorant", short: "VAL", maxTeamSize: 5 },
  { slug: "mobile-legends", name: "Mobile Legends", short: "MLBB", maxTeamSize: 5 },
  { slug: "minecraft", name: "Minecraft", short: "MC", maxTeamSize: 8 },
] as const;

export type GameSlug = (typeof GAMES)[number]["slug"];

export const GAME_SLUGS = GAMES.map((g) => g.slug) as [GameSlug, ...GameSlug[]];

export const MODES = ["solo", "duo", "squad"] as const;
export type GameMode = (typeof MODES)[number];

export const TEAM_SIZE_BY_MODE: Record<GameMode, number> = {
  solo: 1,
  duo: 2,
  squad: 4,
};

export const FORMATS = [
  "single_elimination",
  "double_elimination",
  "round_robin",
  "league",
  "battle_royale",
  "custom",
] as const;
export type TournamentFormat = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Knockout",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  league: "League",
  battle_royale: "Battle Royale",
  custom: "Custom",
};

export const TOURNAMENT_STATUSES = [
  "draft",
  "published",
  "registration_open",
  "registration_closed",
  "live",
  "completed",
  "cancelled",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const MATCH_STATUSES = [
  "scheduled",
  "room_published",
  "live",
  "awaiting_verification",
  "verified",
  "disputed",
  "cancelled",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "waitlisted",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const ROLES = ["super_admin", "admin", "tournament_manager", "moderator", "player"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  tournament_manager: "Tournament Manager",
  moderator: "Moderator",
  player: "Player",
};

/** Hierarchy weight — higher wins. Used for server-side staff checks. */
export const ROLE_WEIGHT: Record<Role, number> = {
  super_admin: 100,
  admin: 70,
  tournament_manager: 50,
  moderator: 30,
  player: 10,
};

export const STAFF_ROLES: Role[] = ["super_admin", "admin", "tournament_manager", "moderator"];

export const PAYMENT_STATUSES = ["created", "pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUPPORT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "registration",
  "approval",
  "match",
  "room",
  "result",
  "winner",
  "team",
  "announcement",
  "admin",
  "payment",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
