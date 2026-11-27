/**
 * Data-access layer for the Android app. Every call uses the shared rjnx
 * schema and the publishable key — RLS applies exactly as on the web.
 */
import { supabase } from "./supabase";
import type {
  Game,
  Match,
  Notification,
  Profile,
  Team,
  Tournament,
  TournamentRegistration,
} from "@rjnx/shared";

export interface TournamentListItem extends Tournament {
  slots: { taken: number; approved: number };
}

const TOURNAMENT_FIELDS =
  "id, slug, name, game_id, mode, format, description, rules, banner_url, entry_fee, prize_pool, prize_distribution, max_slots, min_team_size, max_team_size, registration_starts_at, registration_ends_at, starts_at, ends_at, status, is_featured, requires_approval, created_at, game:games(id, slug, name, short_name, cover_url)";

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase.from("games").select("*").eq("is_active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Game[];
}

export async function fetchTournaments(options: {
  status?: string;
  gameId?: string;
  mode?: string;
  limit?: number;
} = {}): Promise<TournamentListItem[]> {
  let query = supabase.from("tournaments").select(TOURNAMENT_FIELDS).neq("status", "draft").order("starts_at", {
    ascending: true,
  });

  if (options.status && options.status !== "all") {
    if (options.status === "upcoming") query = query.in("status", ["published", "registration_open", "registration_closed"]);
    else query = query.eq("status", options.status);
  }
  if (options.gameId) query = query.eq("game_id", options.gameId);
  if (options.mode && options.mode !== "all") query = query.eq("mode", options.mode);
  query = query.limit(options.limit ?? 40);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Tournament[];
  const slots = await fetchSlotCounts(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, slots: slots[row.id] ?? { taken: 0, approved: 0 } }));
}

export async function fetchSlotCounts(ids: string[]): Promise<Record<string, { taken: number; approved: number }>> {
  if (!ids.length) return {};
  const { data } = await supabase.from("tournament_slot_counts").select("tournament_id, taken, approved").in("tournament_id", ids);
  const map: Record<string, { taken: number; approved: number }> = {};
  for (const row of (data ?? []) as { tournament_id: string; taken: number; approved: number }[]) {
    map[row.tournament_id] = { taken: row.taken, approved: row.approved };
  }
  return map;
}

export async function fetchTournament(slug: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(`${TOURNAMENT_FIELDS}, scoring_rules(name, placement_points, kill_points, tie_breakers)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const tournament = data as unknown as Tournament;
  const [slots, matches] = await Promise.all([
    fetchSlotCounts([tournament.id]),
    supabase
      .from("matches")
      .select("id, round, match_number, scheduled_at, status, map_name")
      .eq("tournament_id", tournament.id)
      .order("round")
      .order("match_number"),
  ]);

  return {
    tournament,
    slots: slots[tournament.id] ?? { taken: 0, approved: 0 },
    matches: (matches.data ?? []) as unknown as Match[],
  };
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function fetchMyRegistrations(userId: string): Promise<TournamentRegistration[]> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      "id, status, slot_number, payment_status, created_at, team_id, tournament:tournaments(id, slug, name, starts_at, status, prize_pool, entry_fee, mode, game:games(name, short_name))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as TournamentRegistration[];
}

export async function fetchMyMatches(userId: string) {
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .eq("user_id", userId)
    .in("status", ["pending", "approved"]);

  const ids = (registrations ?? []).map((row: { tournament_id: string }) => row.tournament_id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("id, round, match_number, scheduled_at, status, map_name, room_published_at, tournament:tournaments(name, slug, game:games(short_name))")
    .in("tournament_id", ids)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);

  const matches = (data ?? []) as unknown as (Match & { tournament: { name: string; slug: string; game: { short_name: string } | null } | null })[];
  const withRooms = await Promise.all(
    matches.map(async (match) => {
      if (!match.room_published_at) return { ...match, room: null as { room_id: string; room_password: string } | null };
      const { data: room } = await supabase.rpc("match_room_credentials", { p_match_id: match.id });
      const row = Array.isArray(room) ? room[0] : null;
      return {
        ...match,
        room: row?.room_id ? { room_id: row.room_id, room_password: row.room_password ?? "" } : null,
      };
    }),
  );
  return withRooms;
}

export interface TeamMemberRow {
  user_id: string;
  role: string;
  profile: { username: string; avatar_url: string | null; in_game_name?: string | null } | null;
}

export interface MyTeamState {
  /** Null when the player is not on a team. */
  membership: { team_id: string; role: string; team: Team } | null;
  members: TeamMemberRow[];
}

export async function fetchMyTeams(userId: string): Promise<MyTeamState> {
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role, team:teams(id, name, tag, logo_url, game_id, captain_id)")
    .eq("user_id", userId)
    .maybeSingle();

  const row = (membership as unknown as { team_id: string; role: string; team: Team | null } | null) ?? null;
  if (!row?.team) return { membership: null, members: [] };

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, profile:profiles(username, avatar_url, in_game_name)")
    .eq("team_id", row.team_id);

  return {
    membership: { team_id: row.team_id, role: row.role, team: row.team },
    members: (members ?? []) as unknown as TeamMemberRow[],
  };
}

export async function fetchMyInvitations(userId: string) {
  const { data } = await supabase
    .from("team_invitations")
    .select("id, created_at, message, team:teams(id, name, tag), inviter:profiles!team_invitations_inviter_id_fkey(username)")
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as {
    id: string;
    message: string | null;
    team: { id: string; name: string; tag: string | null } | null;
    inviter: { username: string } | null;
  }[];
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notification[];
}

export async function fetchLeaderboard(scope: "players" | "teams" = "players", limit = 30) {
  const { data, error } = await supabase
    .from("global_leaderboard")
    .select("*, team:teams(id, name, tag, logo_url), profile:profiles(id, username, avatar_url, country)")
    .order("total_points", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as {
    owner_id: string;
    team_id: string | null;
    user_id: string | null;
    total_points: number;
    total_kills: number;
    wins: number;
    tournaments: number;
    team: { id: string; name: string; tag: string | null; logo_url: string | null } | null;
    profile: { id: string; username: string; avatar_url: string | null; country: string | null } | null;
  }[];
  return rows.filter((row) => (scope === "teams" ? Boolean(row.team_id) : Boolean(row.user_id)));
}

export async function fetchPlatformStats() {
  const { data } = await supabase.from("public_platform_stats").select("*").maybeSingle();
  return (data ?? null) as {
    total_tournaments: number;
    total_players: number;
    total_teams: number;
    total_prize_pool: number;
    live_tournaments: number;
  } | null;
}

export async function fetchBanners() {
  const { data } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as { id: string; title: string; subtitle: string | null; image_url: string; link_url: string | null; placement: string }[];
}

export async function fetchNews() {
  const { data } = await supabase
    .from("news_articles")
    .select("id, slug, title, excerpt, cover_url, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(10);
  return (data ?? []) as { id: string; slug: string; title: string; excerpt: string | null; cover_url: string | null; published_at: string | null }[];
}

/* ------------------------------------------------------------- mutations */

export async function registerForTournament(tournamentId: string, teamId?: string | null) {
  const { error } = await supabase.rpc("register_for_tournament", {
    p_tournament_id: tournamentId,
    p_team_id: teamId ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function cancelRegistration(registrationId: string) {
  const { error } = await supabase.rpc("cancel_registration", { p_registration_id: registrationId });
  if (error) throw new Error(error.message);
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const { data: invitation, error: fetchError } = await supabase
    .from("team_invitations")
    .select("team_id, invitee_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (fetchError || !invitation) throw new Error("Invitation not found");

  if (accept) {
    const { error: joinError } = await supabase
      .from("team_members")
      .insert({ team_id: invitation.team_id, user_id: invitation.invitee_id, role: "member" });
    if (joinError) throw new Error(joinError.message);
  }

  const { error } = await supabase
    .from("team_invitations")
    .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) throw new Error(error.message);
}

export async function markNotificationsRead(userId: string) {
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
}

export async function registerPushToken(userId: string, token: string) {
  await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform: "android" },
    { onConflict: "token" },
  );
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function createSupportTicket(input: { userId: string; subject: string; category: string; message: string }) {
  const { error } = await supabase.from("support_tickets").insert({
    user_id: input.userId,
    subject: input.subject,
    category: input.category,
    message: input.message,
  });
  if (error) throw new Error(error.message);
}

export async function fetchMyTickets(userId: string) {
  const { data } = await supabase
    .from("support_tickets")
    .select("id, subject, status, message, admin_reply, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as { id: string; subject: string; status: string; message: string; admin_reply: string | null; created_at: string }[];
}

export async function fetchPlayerStats(userId: string) {
  const { data, error } = await supabase.rpc("player_stats", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return (data ?? null) as {
    registered_tournaments: number;
    tournaments_played: number;
    completed_matches: number;
    wins: number;
    losses: number;
    total_kills: number;
    total_earnings: number;
    global_rank: number | null;
  } | null;
}

export async function createTeam(input: { name: string; tag: string | null; gameId: string | null; userId: string }) {
  const { data, error } = await supabase
    .from("teams")
    .insert({ name: input.name, tag: input.tag, game_id: input.gameId, captain_id: input.userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: (data as { id: string }).id, user_id: input.userId, role: "captain" });
  if (memberError) {
    // Roll back the orphan team so the roster never sits in a broken state.
    await supabase.from("teams").delete().eq("id", (data as { id: string }).id);
    throw new Error(memberError.message);
  }
  return (data as { id: string }).id;
}

export async function invitePlayerByUsername(teamId: string, inviterId: string, username: string, message?: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", username.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error("No player found with that username");
  if ((profile as { id: string }).id === inviterId) throw new Error("You are already on this team");

  const { error: inviteError } = await supabase.from("team_invitations").insert({
    team_id: teamId,
    inviter_id: inviterId,
    invitee_id: (profile as { id: string }).id,
    message: message ?? null,
  });
  if (inviteError) throw new Error(inviteError.message);
}

export async function leaveTeam(teamId: string, userId: string) {
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function disbandTeam(teamId: string) {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}

export async function fetchMyPoints(userId: string) {
  const { data } = await supabase.from("global_leaderboard").select("total_points, wins, tournaments").eq("user_id", userId).maybeSingle();
  return (data ?? null) as { total_points: number; wins: number; tournaments: number } | null;
}
