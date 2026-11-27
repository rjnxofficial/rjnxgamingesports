import "server-only";
import { dataClient } from "@/lib/supabase/safe";
import { safeQuery } from "@/server/safe";
import type {
  Banner,
  Game,
  LeaderboardEntry,
  Match,
  NewsArticle,
  Profile,
  Team,
  Tournament,
  TournamentRegistration,
} from "@rjnx/shared";

export interface ScoringRuleSummary {
  name: string;
  placement_points: { placement: number; points: number }[];
  kill_points: number;
  bonus_rules: Record<string, number> | null;
  tie_breakers: string[];
}

export const PUBLIC_TOURNAMENT_FIELDS =
  "id, slug, name, game_id, mode, format, description, rules, banner_url, entry_fee, prize_pool, prize_distribution, max_slots, min_team_size, max_team_size, registration_starts_at, registration_ends_at, starts_at, ends_at, status, is_featured, requires_approval, scoring_rule_id, created_at, updated_at, game:games(id, slug, name, short_name, cover_url)";

export type TournamentCard = Tournament & { slots?: { taken: number; approved: number } };
export type { TournamentCardData } from "@/components/tournaments/tournament-card";

export interface TournamentFilters {
  status?: string;
  game?: string;
  mode?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
  page?: number;
  order?: "starts_asc" | "starts_desc" | "created_desc";
}

const STATUS_GROUPS: Record<string, string[]> = {
  upcoming: ["published", "registration_open", "registration_closed"],
  live: ["live"],
  completed: ["completed"],
  registration_open: ["registration_open"],
};

async function getGamesInner(): Promise<Game[]> {
  const supabase = await dataClient();
  const { data } = await supabase.from("games").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as Game[];
}

async function listTournamentsInner(filters: TournamentFilters = {}) {
  const supabase = await dataClient();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(48, Math.max(1, filters.limit ?? 12));

  let query = supabase
    .from("tournaments")
    .select(PUBLIC_TOURNAMENT_FIELDS, { count: "exact" })
    .neq("status", "draft");

  if (filters.status && filters.status !== "all") {
    const group = STATUS_GROUPS[filters.status];
    if (group) query = query.in("status", group);
    else query = query.eq("status", filters.status);
  }
  if (filters.mode && filters.mode !== "all") query = query.eq("mode", filters.mode);
  if (filters.featured) query = query.eq("is_featured", true);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.game && filters.game !== "all") {
    const { data: game } = await supabase.from("games").select("id").eq("slug", filters.game).maybeSingle();
    if (game?.id) query = query.eq("game_id", game.id);
  }

  switch (filters.order ?? "starts_asc") {
    case "starts_desc":
      query = query.order("starts_at", { ascending: false });
      break;
    case "created_desc":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("starts_at", { ascending: true });
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) throw new Error(error.message);

  const tournaments = (data ?? []) as unknown as TournamentCard[];
  const slots = await getSlotCounts(tournaments.map((t) => t.id));
  return {
    rows: tournaments.map((t) => ({ ...t, slots: slots[t.id] ?? { taken: 0, approved: 0 } })),
    count: count ?? 0,
    page,
    pageSize: limit,
  };
}

async function getSlotCountsInner(ids: string[]): Promise<Record<string, { taken: number; approved: number }>> {
  if (!ids.length) return {};
  const supabase = await dataClient();
  const { data } = await supabase
    .from("tournament_slot_counts")
    .select("tournament_id, taken, approved, pending")
    .in("tournament_id", ids);
  const map: Record<string, { taken: number; approved: number }> = {};
  for (const row of (data ?? []) as { tournament_id: string; taken: number; approved: number }[]) {
    map[row.tournament_id] = { taken: row.taken, approved: row.approved };
  }
  return map;
}

async function getTournamentBySlugInner(slug: string) {
  const supabase = await dataClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select(`${PUBLIC_TOURNAMENT_FIELDS}, scoring_rules(name, placement_points, kill_points, bonus_rules, tie_breakers)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      tournament: null as (Tournament & { scoring_rules?: ScoringRuleSummary | null }) | null,
      slots: { taken: 0, approved: 0 },
      participants: [] as (TournamentRegistration & {
        team?: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null;
        profile?: Pick<Profile, "id" | "username" | "avatar_url" | "in_game_name"> | null;
      })[],
      matches: [] as Match[],
      leaderboard: [] as LeaderboardEntry[],
    };
  }

  const tournament = data as unknown as Tournament & { scoring_rules?: ScoringRuleSummary | null };

  const [slots, participants, matches, leaderboard] = await Promise.all([
    getSlotCounts([tournament.id]),
    supabase
      .from("tournament_registrations")
      .select("id, user_id, team_id, status, slot_number, seed, created_at, team:teams(id, name, tag, logo_url), profile:profiles(id, username, avatar_url, in_game_name)")
      .eq("tournament_id", tournament.id)
      .in("status", ["approved", "pending"])
      .order("slot_number", { ascending: true }),
    supabase
      .from("matches")
      .select("id, round, group_label, match_number, scheduled_at, status, map_name, room_published_at")
      .eq("tournament_id", tournament.id)
      .order("round")
      .order("match_number"),
    supabase
      .from("leaderboard_entries")
      .select("*, team:teams(id, name, tag, logo_url), profile:profiles(id, username, avatar_url)")
      .eq("tournament_id", tournament.id)
      .order("rank", { ascending: true }),
  ]);

  return {
    tournament,
    slots: slots[tournament.id] ?? { taken: 0, approved: 0 },
    participants: (participants.data ?? []) as unknown as (TournamentRegistration & {
      team?: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null;
      profile?: Pick<Profile, "id" | "username" | "avatar_url" | "in_game_name"> | null;
    })[],
    matches: (matches.data ?? []) as unknown as Match[],
    leaderboard: (leaderboard.data ?? []) as unknown as LeaderboardEntry[],
  };
}

async function getHomeDataInner() {
  const supabase = await dataClient();
  const [featured, upcoming, live, news, banners, stats, winners, leaderboard] = await Promise.all([
    listTournaments({ featured: true, limit: 3, order: "starts_asc" }),
    listTournaments({ status: "upcoming", limit: 6, order: "starts_asc" }),
    listTournaments({ status: "live", limit: 4 }),
    supabase
      .from("news_articles")
      .select("id, slug, title, excerpt, cover_url, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3),
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("public_platform_stats").select("*").maybeSingle(),
    supabase
      .from("tournaments")
      .select("id, slug, name, banner_url, prize_pool, starts_at, game:games(name, short_name)")
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(4),
    supabase
      .from("global_leaderboard")
      .select("*, team:teams(id, name, tag, logo_url), profile:profiles(id, username, avatar_url)")
      .order("total_points", { ascending: false })
      .limit(5),
  ]);

  return {
    featured: featured.rows,
    upcoming: upcoming.rows,
    live: live.rows,
    news: (news.data ?? []) as Pick<NewsArticle, "id" | "slug" | "title" | "excerpt" | "cover_url" | "published_at">[],
    banners: (banners.data ?? []) as Banner[],
    stats: (stats.data ?? null) as
      | { total_tournaments: number; total_players: number; total_teams: number; total_prize_pool: number; live_tournaments: number }
      | null,
    winners: (winners.data ?? []) as unknown as {
      id: string;
      slug: string;
      name: string;
      banner_url: string | null;
      prize_pool: number;
      starts_at: string;
      game: { name: string; short_name: string } | null;
    }[],
    leaderboard: (leaderboard.data ?? []) as unknown as (LeaderboardEntry & {
      team?: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null;
      profile?: Pick<Profile, "id" | "username" | "avatar_url"> | null;
    })[],
  };
}

export interface GlobalLeaderboardRow {
  owner_id: string;
  team_id: string | null;
  user_id: string | null;
  total_points: number;
  total_kills: number;
  wins: number;
  tournaments: number;
  best_placement: number | null;
  team?: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null;
  profile?: Pick<Profile, "id" | "username" | "avatar_url"> & { country?: string | null } | null;
}

async function getGlobalLeaderboardInner(limit = 50, scope: "players" | "teams" = "players") {
  const supabase = await dataClient();
  const { data } = await supabase
    .from("global_leaderboard")
    .select("*, team:teams(id, name, tag, logo_url), profile:profiles(id, username, avatar_url, country)")
    .order("total_points", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as unknown as GlobalLeaderboardRow[];
  return rows.filter((row) => (scope === "teams" ? Boolean(row.team_id) : Boolean(row.user_id)));
}

async function listPlayersInner(search?: string, limit = 24) {
  const supabase = await dataClient();
  let query = supabase
    .from("public_player_stats")
    .select("*")
    .order("total_points", { ascending: false })
    .order("username")
    .limit(limit);
  if (search) query = query.ilike("username", `%${search}%`);
  const { data } = await query;
  return (data ?? []) as unknown as {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    state: string | null;
    in_game_name: string | null;
    total_points: number;
    total_kills: number;
    wins: number;
    tournaments_played: number;
    rank: number | null;
  }[];
}

async function getPlayerByUsernameInner(username: string) {
  const supabase = await dataClient();
  const { data: profile } = await supabase
    .from("public_player_stats")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  if (!profile) return null;

  const typed = profile as unknown as {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    state: string | null;
    in_game_name: string | null;
    total_points: number;
    total_kills: number;
    wins: number;
    tournaments_played: number;
    rank: number | null;
    created_at: string;
  };

  const [teams, history, achievements] = await Promise.all([
    supabase.from("team_members").select("role, team:teams(id, name, tag, logo_url)").eq("user_id", typed.id),
    supabase
      .from("tournament_registrations")
      .select("status, created_at, slot_number, tournament:tournaments(id, slug, name, starts_at, status, prize_pool, game:games(name, short_name))")
      .eq("user_id", typed.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("leaderboard_entries")
      .select("rank, total_points, total_kills, wins, tournament:tournaments(id, slug, name)")
      .eq("user_id", typed.id)
      .not("rank", "is", null)
      .lte("rank", 3)
      .limit(10),
  ]);

  return {
    profile: typed,
    teams: (teams.data ?? []) as unknown as { role: string; team: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null }[],
    history: (history.data ?? []) as unknown as {
      status: string;
      created_at: string;
      slot_number: number | null;
      tournament: { id: string; slug: string; name: string; starts_at: string; status: string; prize_pool: number; game: { name: string; short_name: string } | null } | null;
    }[],
    achievements: (achievements.data ?? []) as unknown as {
      rank: number | null;
      total_points: number;
      total_kills: number;
      wins: number;
      tournament: { id: string; slug: string; name: string } | null;
    }[],
  };
}

async function listTeamsInner(options: { game?: string; search?: string; limit?: number } = {}) {
  const supabase = await dataClient();
  let query = supabase
    .from("public_team_stats")
    .select("*, game:games(name, short_name, slug), captain:profiles(id, username, avatar_url)")
    .order("total_points", { ascending: false })
    .order("name")
    .limit(options.limit ?? 36);
  if (options.search) query = query.ilike("name", `%${options.search}%`);
  if (options.game && options.game !== "all") {
    const { data: game } = await supabase.from("games").select("id").eq("slug", options.game).maybeSingle();
    if (game?.id) query = query.eq("game_id", game.id);
  }
  const { data } = await query;
  return (data ?? []) as unknown as {
    id: string;
    name: string;
    tag: string | null;
    logo_url: string | null;
    member_count: number;
    total_points: number;
    wins: number;
    tournaments_played: number;
    game: { name: string; short_name: string; slug: string } | null;
  }[];
}

async function listNewsInner(limit = 12) {
  const supabase = await dataClient();
  const { data } = await supabase
    .from("news_articles")
    .select("id, slug, title, excerpt, cover_url, published_at, author:profiles(username)")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    cover_url: string | null;
    published_at: string | null;
    author: { username: string } | null;
  }[];
}

type ArticleWithAuthor = NewsArticle & { author: { username: string; avatar_url: string | null } | null };

async function getArticleBySlugInner(slug: string): Promise<ArticleWithAuthor | null> {
  const supabase = await dataClient();
  const { data } = await supabase
    .from("news_articles")
    .select("*, author:profiles(username, avatar_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as unknown as ArticleWithAuthor | null) ?? null;
}

async function listResultsInner(limit = 24) {
  const supabase = await dataClient();
  const { data } = await supabase
    .from("tournaments")
    .select(
      "id, slug, name, banner_url, prize_pool, starts_at, ends_at, mode, game:games(name, short_name), leaderboard_entries(rank, total_points, total_kills, wins, team:teams(name, tag, logo_url), profile:profiles(username, avatar_url))",
    )
    .eq("status", "completed")
    .order("starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as {
    id: string;
    slug: string;
    name: string;
    banner_url: string | null;
    prize_pool: number;
    starts_at: string;
    ends_at: string | null;
    mode: string;
    game: { name: string; short_name: string } | null;
    leaderboard_entries: {
      rank: number | null;
      total_points: number;
      total_kills: number;
      wins: number;
      team: { name: string; tag: string | null; logo_url: string | null } | null;
      profile: { username: string; avatar_url: string | null } | null;
    }[];
  }[];
}

async function getPlatformSettingsInner(): Promise<Record<string, unknown>> {
  const supabase = await dataClient();
  const { data } = await supabase.from("platform_settings").select("key, value");
  const map: Record<string, unknown> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) map[row.key] = row.value;
  return map;
}

/* =====================================================================
 * Public API — every loader is wrapped so a database outage degrades the
 * page into an empty state instead of a 500 error. Errors are logged with
 * a stable tag (see src/server/safe.ts).
 * ================================================================== */

const EMPTY_PAGE = { rows: [] as TournamentCard[], count: 0, page: 1, pageSize: 12 };

export async function getGames(): Promise<Game[]> {
  return safeQuery("games", () => getGamesInner(), []);
}

export async function listTournaments(filters: TournamentFilters = {}) {
  return safeQuery(
    "tournaments",
    () => listTournamentsInner(filters),
    { ...EMPTY_PAGE, page: Math.max(1, filters.page ?? 1), pageSize: Math.min(48, Math.max(1, filters.limit ?? 12)) },
  );
}

export async function getSlotCounts(ids: string[]): Promise<Record<string, { taken: number; approved: number }>> {
  return safeQuery("slot-counts", () => getSlotCountsInner(ids), {});
}

export async function getTournamentBySlug(
  slug: string,
): Promise<Awaited<ReturnType<typeof getTournamentBySlugInner>>> {
  return safeQuery("tournament-detail", () => getTournamentBySlugInner(slug), {
    tournament: null,
    slots: { taken: 0, approved: 0 },
    participants: [],
    matches: [],
    leaderboard: [],
  });
}

export async function getHomeData() {
  return safeQuery(
    "home",
    () => getHomeDataInner(),
    {
      featured: [] as TournamentCard[],
      upcoming: [] as TournamentCard[],
      live: [] as TournamentCard[],
      news: [] as Pick<NewsArticle, "id" | "slug" | "title" | "excerpt" | "cover_url" | "published_at">[],
      banners: [] as Banner[],
      stats: null as
        | { total_tournaments: number; total_players: number; total_teams: number; total_prize_pool: number; live_tournaments: number }
        | null,
      winners: [] as {
        id: string;
        slug: string;
        name: string;
        banner_url: string | null;
        prize_pool: number;
        starts_at: string;
        game: { name: string; short_name: string } | null;
      }[],
      leaderboard: [] as (LeaderboardEntry & {
        team?: Pick<Team, "id" | "name" | "tag" | "logo_url"> | null;
        profile?: Pick<Profile, "id" | "username" | "avatar_url"> | null;
      })[],
    },
  );
}

export async function getGlobalLeaderboard(limit = 50, scope: "players" | "teams" = "players") {
  return safeQuery("leaderboard", () => getGlobalLeaderboardInner(limit, scope), [] as GlobalLeaderboardRow[]);
}

export async function listPlayers(search?: string, limit = 24): Promise<Awaited<ReturnType<typeof listPlayersInner>>> {
  return safeQuery("players", () => listPlayersInner(search, limit), []);
}

export async function getPlayerByUsername(
  username: string,
): Promise<Awaited<ReturnType<typeof getPlayerByUsernameInner>>> {
  return safeQuery("player", () => getPlayerByUsernameInner(username), null);
}

export async function listTeams(
  options: { game?: string; search?: string; limit?: number } = {},
): Promise<Awaited<ReturnType<typeof listTeamsInner>>> {
  return safeQuery("teams", () => listTeamsInner(options), []);
}

export async function listNews(limit = 12): Promise<Awaited<ReturnType<typeof listNewsInner>>> {
  return safeQuery("news", () => listNewsInner(limit), []);
}

export async function getArticleBySlug(slug: string): Promise<Awaited<ReturnType<typeof getArticleBySlugInner>>> {
  return safeQuery("article", () => getArticleBySlugInner(slug), null);
}

export async function listResults(limit = 24): Promise<Awaited<ReturnType<typeof listResultsInner>>> {
  return safeQuery("results", () => listResultsInner(limit), []);
}

export async function getPlatformSettings(): Promise<Record<string, unknown>> {
  return safeQuery("settings", () => getPlatformSettingsInner(), {});
}
