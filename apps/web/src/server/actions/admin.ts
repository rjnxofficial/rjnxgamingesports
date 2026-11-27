"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  bannerSchema,
  matchResultSchema,
  matchSchema,
  newsSchema,
  notificationSchema,
  platformSettingSchema,
  registrationReviewSchema,
  roleGrantSchema,
  roomCredentialsSchema,
  scoringRuleSchema,
  supportReplySchema,
  tournamentSchema,
  verifyResultSchema,
  calculateScore,
  scoringConfigFromRule,
  slugify,
  type ApiResult,
} from "@rjnx/shared";
import { getSessionContext, requireStaff, requireSuperAdmin } from "@/server/auth";
import { notifyMany, notifyUser, writeAudit } from "@/server/audit";
import { createAdminClient } from "@/lib/supabase/admin";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullable(value: string): string | null {
  return value.length ? value : null;
}
function boolValue(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

/* ============================================================ tournaments */

type TournamentFormResult = ApiResult<null> & { id?: string };

export async function saveTournamentAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<TournamentFormResult> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const id = str(formData, "id");
  const parsed = tournamentSchema.safeParse({
    name: str(formData, "name"),
    slug: str(formData, "slug") || slugify(str(formData, "name")),
    game_id: str(formData, "game_id"),
    mode: str(formData, "mode"),
    format: str(formData, "format"),
    description: str(formData, "description"),
    rules: str(formData, "rules"),
    banner_url: str(formData, "banner_url"),
    entry_fee: str(formData, "entry_fee") || "0",
    prize_pool: str(formData, "prize_pool") || "0",
    max_slots: str(formData, "max_slots") || "64",
    min_team_size: str(formData, "min_team_size") || "1",
    max_team_size: str(formData, "max_team_size") || "4",
    registration_starts_at: nullable(str(formData, "registration_starts_at")),
    registration_ends_at: nullable(str(formData, "registration_ends_at")),
    starts_at: str(formData, "starts_at"),
    ends_at: nullable(str(formData, "ends_at")),
    status: str(formData, "status") || "draft",
    is_featured: boolValue(formData, "is_featured"),
    requires_approval: boolValue(formData, "requires_approval"),
    scoring_rule_id: nullable(str(formData, "scoring_rule_id")),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid tournament", field: issue?.path.join(".") };
  }

  // Prize distribution built from three place/amount pairs.
  const distribution: { place: number; amount: number; label?: string }[] = [];
  for (const place of [1, 2, 3]) {
    const amount = Number(str(formData, `prize_place_${place}`) || 0);
    if (amount > 0) distribution.push({ place, amount });
  }

  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    game_id: parsed.data.game_id,
    mode: parsed.data.mode,
    format: parsed.data.format,
    description: nullable(parsed.data.description ?? ""),
    rules: nullable(parsed.data.rules ?? ""),
    banner_url: parsed.data.banner_url || null,
    entry_fee: parsed.data.entry_fee,
    prize_pool: parsed.data.prize_pool,
    prize_distribution: distribution,
    max_slots: parsed.data.max_slots,
    min_team_size: parsed.data.min_team_size,
    max_team_size: parsed.data.max_team_size,
    registration_starts_at: parsed.data.registration_starts_at || null,
    registration_ends_at: parsed.data.registration_ends_at || null,
    starts_at: parsed.data.starts_at,
    ends_at: parsed.data.ends_at || null,
    status: parsed.data.status,
    is_featured: parsed.data.is_featured,
    requires_approval: parsed.data.requires_approval,
    scoring_rule_id: parsed.data.scoring_rule_id || null,
  };

  if (id) {
    const { error } = await session.supabase.from("tournaments").update(payload).eq("id", id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "That slug is already used.", field: "slug" };
      return { ok: false, error: error.message };
    }
    await writeAudit(session.supabase, session.user.id, "tournament.update", "tournament", id, { name: payload.name });
  } else {
    const { data, error } = await session.supabase
      .from("tournaments")
      .insert({ ...payload, created_by: session.user.id })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, error: "That slug is already used.", field: "slug" };
      return { ok: false, error: error.message };
    }
    await writeAudit(session.supabase, session.user.id, "tournament.create", "tournament", data.id, { name: payload.name });
    revalidatePath("/admin/tournaments");
    revalidatePath("/tournaments");
    return { ok: true, data: null, id: data.id as string };
  }

  revalidatePath("/admin/tournaments");
  revalidatePath(`/tournaments/${payload.slug}`);
  revalidatePath("/tournaments");
  revalidatePath("/");
  return { ok: true, data: null, id };
}

export async function setTournamentStatusAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const id = str(formData, "tournament_id");
  const status = str(formData, "status");
  const allowed = ["draft", "published", "registration_open", "registration_closed", "live", "completed", "cancelled"];
  if (!allowed.includes(status)) return { ok: false, error: "Invalid status" };

  const { data, error } = await session.supabase
    .from("tournaments")
    .update({ status })
    .eq("id", id)
    .select("slug, name")
    .single();
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "tournament.status", "tournament", id, { status });

  // Notify approved participants when a tournament goes live or completes.
  if (status === "live" || status === "completed") {
    const { data: registrations } = await session.supabase
      .from("tournament_registrations")
      .select("user_id")
      .eq("tournament_id", id)
      .eq("status", "approved");
    const userIds = [...new Set(((registrations ?? []) as { user_id: string }[]).map((row) => row.user_id))];
    await notifyMany(
      userIds,
      status === "live" ? "match" : "result",
      status === "live" ? `${data.name} is live` : `${data.name} results are in`,
      status === "live" ? "Open your match center for room details." : "Check the final standings on the leaderboard.",
      status === "live" ? "/dashboard/matches" : `/tournaments/${data.slug}`,
    );
  }

  revalidatePath("/admin/tournaments");
  revalidatePath(`/tournaments/${data.slug}`);
  revalidatePath("/tournaments");
  return { ok: true, data: null };
}

export async function deleteTournamentAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session?.isSuperAdmin) return { ok: false, error: "Only a super admin can delete tournaments." };
  const id = str(formData, "tournament_id");

  const { error } = await session.supabase.from("tournaments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "tournament.delete", "tournament", id);
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  return { ok: true, data: null };
}

/* ========================================================== registration */

export async function reviewRegistrationAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = registrationReviewSchema.safeParse({
    registration_id: str(formData, "registration_id"),
    status: str(formData, "status"),
    notes: str(formData, "notes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  const { data, error } = await session.supabase
    .from("tournament_registrations")
    .update({
      status: parsed.data.status,
      notes: nullable(parsed.data.notes ?? ""),
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.registration_id)
    .select("user_id, tournament:tournaments(name, slug)")
    .single();

  if (error) return { ok: false, error: error.message };

  const tournament = (data as unknown as { tournament?: { name: string; slug: string } }).tournament;
  await notifyUser(
    session.supabase,
    (data as { user_id: string }).user_id,
    "approval",
    `Registration ${parsed.data.status}`,
    `${tournament?.name ?? "Tournament"} — your registration was ${parsed.data.status}.`,
    tournament ? `/tournaments/${tournament.slug}` : "/dashboard/tournaments",
  );

  await writeAudit(session.supabase, session.user.id, "registration.review", "tournament_registration", parsed.data.registration_id, {
    status: parsed.data.status,
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  return { ok: true, data: null };
}

/* ================================================================ matches */

export async function createMatchAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = matchSchema.safeParse({
    tournament_id: str(formData, "tournament_id"),
    round: str(formData, "round") || "1",
    match_number: str(formData, "match_number") || "1",
    group_label: nullable(str(formData, "group_label")),
    scheduled_at: nullable(str(formData, "scheduled_at")),
    map_name: nullable(str(formData, "map_name")),
    status: str(formData, "status") || "scheduled",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid match" };

  const { data, error } = await session.supabase
    .from("matches")
    .insert({
      tournament_id: parsed.data.tournament_id,
      round: parsed.data.round,
      match_number: parsed.data.match_number,
      group_label: parsed.data.group_label || null,
      scheduled_at: parsed.data.scheduled_at || null,
      map_name: parsed.data.map_name || null,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That round/match number already exists." };
    return { ok: false, error: error.message };
  }

  // Auto-seed participants from approved registrations when the lobby is empty.
  const { data: registrations } = await session.supabase
    .from("tournament_registrations")
    .select("id, team_id, user_id")
    .eq("tournament_id", parsed.data.tournament_id)
    .eq("status", "approved");

  if (registrations?.length) {
    let slot = 0;
    const participants = (registrations as { id: string; team_id: string | null; user_id: string }[]).map((row) => ({
      match_id: data.id,
      registration_id: row.id,
      team_id: row.team_id,
      user_id: row.user_id,
      slot: ++slot,
    }));
    await session.supabase.from("match_participants").insert(participants);
  }

  await writeAudit(session.supabase, session.user.id, "match.create", "match", data.id);
  revalidatePath("/admin/matches");
  return { ok: true, data: null };
}

export async function publishRoomAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = roomCredentialsSchema.safeParse({
    match_id: str(formData, "match_id"),
    room_id: str(formData, "room_id"),
    room_password: str(formData, "room_password"),
    publish: true,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid credentials" };

  const { data, error } = await session.supabase
    .from("matches")
    .update({
      room_id: parsed.data.room_id,
      room_password: parsed.data.room_password,
      room_published_at: new Date().toISOString(),
      status: "room_published",
    })
    .eq("id", parsed.data.match_id)
    .select("tournament_id, round, match_number, tournament:tournaments(name, slug)")
    .single();
  if (error) return { ok: false, error: error.message };

  const tournament = (data as unknown as { tournament?: { name: string; slug: string } }).tournament;
  const { data: participants } = await session.supabase
    .from("match_participants")
    .select("user_id, team_id")
    .eq("match_id", parsed.data.match_id);

  const userIds = new Set<string>();
  for (const row of (participants ?? []) as { user_id: string | null; team_id: string | null }[]) {
    if (row.user_id) userIds.add(row.user_id);
    if (row.team_id) {
      const { data: members } = await session.supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", row.team_id);
      for (const member of (members ?? []) as { user_id: string }[]) userIds.add(member.user_id);
    }
  }

  await notifyMany(
    [...userIds],
    "room",
    "Room details published",
    `${tournament?.name ?? "Match"} — round ${(data as { round: number }).round}, match #${(data as { match_number: number }).match_number}. Open your match center for the room ID.`,
    "/dashboard/matches",
  );

  await writeAudit(session.supabase, session.user.id, "match.publish_room", "match", parsed.data.match_id);
  revalidatePath("/admin/matches");
  revalidatePath("/dashboard/matches");
  return { ok: true, data: null };
}

export async function updateMatchStatusAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const matchId = str(formData, "match_id");
  const status = str(formData, "status");
  const allowed = ["scheduled", "room_published", "live", "awaiting_verification", "verified", "disputed", "cancelled"];
  if (!allowed.includes(status)) return { ok: false, error: "Invalid match status" };

  const { data, error } = await session.supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId)
    .select("tournament_id, tournament:tournaments(slug)")
    .single();
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "match.status", "match", matchId, { status });
  revalidatePath("/admin/matches");
  const slug = (data as unknown as { tournament?: { slug: string } }).tournament?.slug;
  if (slug) revalidatePath(`/tournaments/${slug}`);
  return { ok: true, data: null };
}

/* ================================================================ results */

export async function submitResultAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = matchResultSchema.safeParse({
    match_id: str(formData, "match_id"),
    participant_id: str(formData, "participant_id"),
    placement: str(formData, "placement") || null,
    kills: str(formData, "kills") || "0",
    bonus_points: str(formData, "bonus_points") || "0",
    evidence_url: str(formData, "evidence_url"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid result" };

  const { data: match } = await session.supabase
    .from("matches")
    .select("tournament_id, tournament:tournaments(scoring_rule_id)")
    .eq("id", parsed.data.match_id)
    .maybeSingle();
  if (!match) return { ok: false, error: "Match not found." };

  const ruleId = (match as unknown as { tournament?: { scoring_rule_id: string | null } }).tournament?.scoring_rule_id;
  let config = scoringConfigFromRule(null);
  if (ruleId) {
    const { data: rule } = await session.supabase.from("scoring_rules").select("*").eq("id", ruleId).maybeSingle();
    config = scoringConfigFromRule(rule as never);
  }

  const score = calculateScore(
    {
      placement: parsed.data.placement ?? null,
      kills: parsed.data.kills,
      bonusPoints: parsed.data.bonus_points,
    },
    config,
  );

  const { error } = await session.supabase.from("match_results").upsert(
    {
      match_id: parsed.data.match_id,
      participant_id: parsed.data.participant_id,
      placement: score.placement,
      kills: score.kills,
      placement_points: score.placementPoints,
      kill_points: score.killPoints,
      bonus_points: score.bonusPoints,
      total_points: score.totalPoints,
      evidence_url: parsed.data.evidence_url || null,
      submitted_by: session.user.id,
    },
    { onConflict: "match_id,participant_id" },
  );
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "result.submit", "match_result", null, {
    match_id: parsed.data.match_id,
    participant_id: parsed.data.participant_id,
    total_points: score.totalPoints,
  });

  revalidatePath("/admin/results");
  revalidatePath("/admin/matches");
  return { ok: true, data: null };
}

export async function verifyResultsAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const ids = formData.getAll("result_id").map(String).filter(Boolean);
  const parsed = verifyResultSchema.safeParse({ result_ids: ids, verify: str(formData, "verify") !== "false" });
  if (!parsed.success) return { ok: false, error: "Select at least one result." };

  const { data, error } = await session.supabase
    .from("match_results")
    .update({
      is_verified: parsed.data.verify,
      verified_by: parsed.data.verify ? session.user.id : null,
    })
    .in("id", parsed.data.result_ids)
    .select("id, match_id");
  if (error) return { ok: false, error: error.message };

  const matchIds = [...new Set(((data ?? []) as { match_id: string }[]).map((row) => row.match_id))];
  const tournamentIds = new Set<string>();

  for (const matchId of matchIds) {
    const { data: matchRow } = await session.supabase
      .from("matches")
      .select("tournament_id")
      .eq("id", matchId)
      .maybeSingle();
    if (matchRow?.tournament_id) tournamentIds.add(matchRow.tournament_id);
    if (parsed.data.verify) {
      await session.supabase.from("matches").update({ status: "verified" }).eq("id", matchId);
    }
  }

  for (const tournamentId of tournamentIds) {
    // Recalculate the tournament leaderboard from verified results only.
    const { error: rpcError } = await session.supabase.rpc("recalculate_leaderboard", { p_tournament_id: tournamentId });
    if (rpcError) {
      // Fallback: admin client with service role (also runs the same SQL function).
      const admin = createAdminClient();
      if (admin) await admin.rpc("recalculate_leaderboard", { p_tournament_id: tournamentId });
    }
  }

  await writeAudit(session.supabase, session.user.id, "result.verify", "match_result", null, {
    count: parsed.data.result_ids.length,
    verified: parsed.data.verify,
  });

  revalidatePath("/admin/results");
  revalidatePath("/admin/leaderboard");
  revalidatePath("/leaderboard");
  revalidatePath("/results");
  return { ok: true, data: null };
}

export async function recalculateLeaderboardAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;
  const tournamentId = str(formData, "tournament_id");
  if (!tournamentId) return { ok: false, error: "Choose a tournament." };

  const { error } = await session.supabase.rpc("recalculate_leaderboard", { p_tournament_id: tournamentId });
  if (error) {
    const admin = createAdminClient();
    if (!admin) return { ok: false, error: error.message };
    const { error: adminError } = await admin.rpc("recalculate_leaderboard", { p_tournament_id: tournamentId });
    if (adminError) return { ok: false, error: adminError.message };
  }

  revalidatePath("/admin/leaderboard");
  revalidatePath("/leaderboard");
  return { ok: true, data: null };
}

/* ============================================================== users/roles */

export async function suspendUserAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  // Suspension is a super-admin-only capability (platform governance).
  const guard = await requireSuperAdminForAction();
  if (!guard.ok) return guard.result;
  const session = guard;

  const userId = str(formData, "user_id");
  const suspend = str(formData, "suspend") === "true";
  const reason = nullable(str(formData, "reason"));
  if (userId === session.user.id) return { ok: false, error: "You cannot suspend your own account." };

  // Never allow the platform to be left without an active super admin.
  const admin = createAdminClient();
  const client = admin ?? session.supabase;
  const { data: targetRoles } = await client.from("user_roles").select("role").eq("user_id", userId);
  const roles = ((targetRoles ?? []) as { role: string }[]).map((row) => row.role);
  if (roles.includes("super_admin")) {
    const { count } = await client
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (suspend && (count ?? 0) <= 1) return { ok: false, error: "Cannot suspend the last super admin." };
  }

  const { error } = await client
    .from("profiles")
    .update({ is_suspended: suspend, suspended_reason: suspend ? reason : null })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, suspend ? "user.suspend" : "user.unsuspend", "user", userId, { reason });
  await notifyUser(
    session.supabase,
    userId,
    "admin",
    suspend ? "Account suspended" : "Account reinstated",
    suspend ? reason ?? "Contact support for details." : "Your account access has been restored.",
    "/support",
  );

  revalidatePath("/admin/users");
  return { ok: true, data: null };
}

export async function grantRoleAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await requireSuperAdminForAction();
  if (!session.ok) return session.result;

  const parsed = roleGrantSchema.safeParse({ user_id: str(formData, "user_id"), role: str(formData, "role") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid role" };
  if (parsed.data.role === "player") return { ok: false, error: "Every account already has the player role." };

  const { error } = await session.supabase
    .from("user_roles")
    .insert({ user_id: parsed.data.user_id, role: parsed.data.role, granted_by: session.user.id });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That user already has this role." };
    return { ok: false, error: error.message };
  }

  await writeAudit(session.supabase, session.user.id, "role.grant", "user_role", parsed.data.user_id, { role: parsed.data.role });
  await notifyUser(
    session.supabase,
    parsed.data.user_id,
    "admin",
    "Staff role granted",
    `You were granted the ${parsed.data.role.replace(/_/g, " ")} role on RJNX.`,
    "/admin",
  );

  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  return { ok: true, data: null };
}

export async function revokeRoleAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await requireSuperAdminForAction();
  if (!session.ok) return session.result;

  const userId = str(formData, "user_id");
  const role = str(formData, "role");
  if (role === "super_admin") {
    const { count } = await session.supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) <= 1) return { ok: false, error: "Cannot remove the last super admin." };
  }

  const { error } = await session.supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "role.revoke", "user_role", userId, { role });
  revalidatePath("/admin/users");
  revalidatePath("/admin/roles");
  return { ok: true, data: null };
}

/* =================================================================== news */

export async function saveNewsAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const id = str(formData, "id");
  const parsed = newsSchema.safeParse({
    title: str(formData, "title"),
    slug: str(formData, "slug") || slugify(str(formData, "title")),
    excerpt: str(formData, "excerpt"),
    content: str(formData, "content"),
    cover_url: str(formData, "cover_url"),
    is_published: boolValue(formData, "is_published"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid article" };

  const payload = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: nullable(parsed.data.excerpt ?? ""),
    content: parsed.data.content,
    cover_url: parsed.data.cover_url || null,
    is_published: parsed.data.is_published,
    published_at: parsed.data.is_published ? new Date().toISOString() : null,
    author_id: session.user.id,
  };

  const { error } = id
    ? await session.supabase.from("news_articles").update(payload).eq("id", id)
    : await session.supabase.from("news_articles").insert(payload);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That slug already exists.", field: "slug" };
    return { ok: false, error: error.message };
  }

  await writeAudit(session.supabase, session.user.id, id ? "news.update" : "news.create", "news_article", id || null);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function deleteNewsAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;
  const id = str(formData, "id");
  const { error } = await session.supabase.from("news_articles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await writeAudit(session.supabase, session.user.id, "news.delete", "news_article", id);
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true, data: null };
}

/* ================================================================ banners */

export async function saveBannerAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const id = str(formData, "id");
  const parsed = bannerSchema.safeParse({
    title: str(formData, "title"),
    subtitle: str(formData, "subtitle"),
    image_url: str(formData, "image_url"),
    link_url: str(formData, "link_url"),
    placement: str(formData, "placement") || "home_hero",
    is_active: boolValue(formData, "is_active"),
    sort_order: str(formData, "sort_order") || "0",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid banner" };

  const payload = {
    title: parsed.data.title,
    subtitle: nullable(parsed.data.subtitle ?? ""),
    image_url: parsed.data.image_url,
    link_url: parsed.data.link_url || null,
    placement: parsed.data.placement,
    is_active: parsed.data.is_active,
    sort_order: parsed.data.sort_order,
  };

  const { error } = id
    ? await session.supabase.from("banners").update(payload).eq("id", id)
    : await session.supabase.from("banners").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, data: null };
}

export async function deleteBannerAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;
  const id = str(formData, "id");
  const { error } = await session.supabase.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, data: null };
}

/* ========================================================== notifications */

export async function broadcastNotificationAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = notificationSchema.safeParse({
    title: str(formData, "title"),
    body: str(formData, "body"),
    link: str(formData, "link"),
    audience: str(formData, "audience") || "all",
    tournament_id: nullable(str(formData, "tournament_id")),
    user_id: nullable(str(formData, "user_id")),
    type: str(formData, "type") || "announcement",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notification" };

  const admin = createAdminClient();
  const client = admin ?? session.supabase;
  let userIds: string[] = [];

  if (parsed.data.audience === "user") {
    if (!parsed.data.user_id) return { ok: false, error: "Choose a player." };
    userIds = [parsed.data.user_id];
  } else if (parsed.data.audience === "tournament") {
    if (!parsed.data.tournament_id) return { ok: false, error: "Choose a tournament." };
    const { data } = await client
      .from("tournament_registrations")
      .select("user_id")
      .eq("tournament_id", parsed.data.tournament_id)
      .eq("status", "approved");
    userIds = [...new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id))];
  } else if (parsed.data.audience === "staff") {
    const { data } = await client.from("user_roles").select("user_id").in("role", ["super_admin", "admin", "tournament_manager", "moderator"]);
    userIds = [...new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id))];
  } else {
    const { data } = await client.from("profiles").select("id").eq("is_suspended", false);
    userIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
    if (parsed.data.audience === "players") {
      const { data: staff } = await client.from("user_roles").select("user_id").in("role", ["super_admin", "admin", "tournament_manager", "moderator"]);
      const staffIds = new Set(((staff ?? []) as { user_id: string }[]).map((row) => row.user_id));
      userIds = userIds.filter((id) => !staffIds.has(id));
    }
  }

  if (!userIds.length) return { ok: false, error: "No recipients matched that audience." };

  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: parsed.data.type,
    title: parsed.data.title,
    body: nullable(parsed.data.body ?? ""),
    link: nullable(parsed.data.link ?? ""),
  }));

  let inserted = 0;
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    const { error } = await client.from("notifications").insert(chunk);
    if (error) return { ok: false, error: error.message };
    inserted += chunk.length;
  }

  await writeAudit(session.supabase, session.user.id, "notification.broadcast", "notification", null, {
    audience: parsed.data.audience,
    recipients: inserted,
  });

  revalidatePath("/admin/notifications");
  return { ok: true, data: null };
}

/* =============================================================== settings */

export async function saveSettingAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSuperAdmin();
  if (!session.ok) return session.result;

  const parsed = platformSettingSchema.safeParse({
    key: str(formData, "key"),
    value: str(formData, "value"),
    description: str(formData, "description"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid setting" };

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(parsed.data.value);
  } catch {
    parsedValue = parsed.data.value;
  }

  const { error } = await session.supabase.from("platform_settings").upsert({
    key: parsed.data.key,
    value: parsedValue as never,
    description: nullable(parsed.data.description ?? ""),
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "settings.update", "platform_setting", parsed.data.key);
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, data: null };
}

/* ================================================================ support */

export async function replyTicketAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const parsed = supportReplySchema.safeParse({
    ticket_id: str(formData, "ticket_id"),
    status: str(formData, "status") || "in_progress",
    admin_reply: str(formData, "admin_reply"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reply" };

  const { data, error } = await session.supabase
    .from("support_tickets")
    .update({
      status: parsed.data.status,
      admin_reply: parsed.data.admin_reply,
      replied_by: session.user.id,
      replied_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticket_id)
    .select("user_id, subject")
    .single();
  if (error) return { ok: false, error: error.message };

  await notifyUser(
    session.supabase,
    (data as { user_id: string }).user_id,
    "admin",
    "Support replied",
    `Re: ${(data as { subject: string }).subject}`,
    "/dashboard/support",
  );

  revalidatePath("/admin/support");
  return { ok: true, data: null };
}

/* ============================================================== scoring */

export async function saveScoringRuleAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const placements: { placement: number; points: number }[] = [];
  for (let place = 1; place <= 10; place += 1) {
    const value = str(formData, `placement_${place}`);
    if (value !== "") placements.push({ placement: place, points: Number(value) });
  }

  const parsed = scoringRuleSchema.safeParse({
    name: str(formData, "name"),
    placement_points: placements,
    kill_points: str(formData, "kill_points") || "1",
    tie_breakers: ["total_points", "kills", "best_placement"],
    is_default: boolValue(formData, "is_default"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid scoring rule" };

  const id = str(formData, "id");
  const payload = {
    name: parsed.data.name,
    placement_points: parsed.data.placement_points,
    kill_points: parsed.data.kill_points,
    tie_breakers: parsed.data.tie_breakers,
    is_default: parsed.data.is_default,
  };

  if (parsed.data.is_default) {
    await session.supabase.from("scoring_rules").update({ is_default: false }).neq("id", id || "00000000-0000-0000-0000-000000000000");
  }

  const { error } = id
    ? await session.supabase.from("scoring_rules").update(payload).eq("id", id)
    : await session.supabase.from("scoring_rules").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/leaderboard");
  return { ok: true, data: null };
}

/* ================================================================ helpers */


async function getStaff(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>["supabase"]; user: { id: string } }
  | { ok: false; result: ApiResult<null> }
> {
  const session = await getSessionContext();
  if (!session) return { ok: false, result: { ok: false, error: "Sign in as staff to continue." } };
  if (!session.isStaff) return { ok: false, result: { ok: false, error: "You do not have permission for this action." } };
  return { ok: true, supabase: session.supabase, user: { id: session.user.id } };
}

async function getSuperAdmin(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>["supabase"]; user: { id: string } }
  | { ok: false; result: ApiResult<null> }
> {
  const session = await getSessionContext();
  if (!session) return { ok: false, result: { ok: false, error: "Sign in as a super admin to continue." } };
  if (!session.isSuperAdmin) return { ok: false, result: { ok: false, error: "Super admin permission required." } };
  return { ok: true, supabase: session.supabase, user: { id: session.user.id } };
}

async function requireSuperAdminForAction(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>["supabase"]; user: { id: string } }
  | { ok: false; result: ApiResult<null> }
> {
  return getSuperAdmin();
}

export { requireStaff, requireSuperAdmin, redirect };

/* ================================================================ brackets */

export async function generateBracketAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const tournamentId = str(formData, "tournament_id");
  if (!tournamentId) return { ok: false, error: "Missing tournament." };

  const { data: tournament } = await session.supabase
    .from("tournaments")
    .select("id, name, slug, format, mode, starts_at")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) return { ok: false, error: "Tournament not found." };

  const { data: registrations } = await session.supabase
    .from("tournament_registrations")
    .select("id, team_id, user_id")
    .eq("tournament_id", tournamentId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const entries = (registrations ?? []) as { id: string; team_id: string | null; user_id: string }[];
  if (entries.length < 2) {
    return { ok: false, error: "At least 2 approved registrations are required to generate a bracket." };
  }

  // Wipe existing bracket matches (participants/results cascade) — only for this tournament.
  const { error: clearError } = await session.supabase.from("matches").delete().eq("tournament_id", tournamentId);
  if (clearError) return { ok: false, error: clearError.message };

  const { generateBracketForFormat } = await import("@rjnx/shared");
  const keys = entries.map((entry) => entry.id);
  const specs = generateBracketForFormat(tournament.format as never, keys, 12);
  if (!specs.length) return { ok: false, error: "Could not generate a bracket for that format." };

  // Insert round by round so next_match_id can be linked.
  const createdIds: string[] = new Array(specs.length);
  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index]!;
    const { data, error } = await session.supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        round: spec.round,
        match_number: spec.matchNumber,
        bracket_position: spec.bracketPosition,
        scheduled_at: tournament.starts_at,
        status: "scheduled",
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: `Round ${spec.round} match ${spec.matchNumber}: ${error.message}` };
    createdIds[index] = data.id as string;
  }

  for (let index = 0; index < specs.length; index += 1) {
    const spec = specs[index]!;
    const nextIndex = spec.nextIndex;
    if (nextIndex != null && createdIds[nextIndex]) {
      await session.supabase.from("matches").update({ next_match_id: createdIds[nextIndex] }).eq("id", createdIds[index]!);
    }
    const registrationIds = [spec.homeKey, spec.awayKey].filter(Boolean) as string[];
    const participants = registrationIds
      .map((registrationId) => entries.find((entry) => entry.id === registrationId))
      .filter((entry): entry is { id: string; team_id: string | null; user_id: string } => Boolean(entry));
    if (participants.length) {
      await session.supabase.from("match_participants").insert(
        participants.map((entry, slot) => ({
          match_id: createdIds[index]!,
          registration_id: entry.id,
          team_id: entry.team_id,
          user_id: entry.user_id,
          slot: slot + 1,
        })),
      );
    }
  }

  await writeAudit(session.supabase, session.user.id, "bracket.generate", "tournament", tournamentId, {
    matches: specs.length,
    format: tournament.format,
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/admin/matches");
  revalidatePath(`/tournaments/${tournament.slug}`);
  return { ok: true, data: null };
}

export async function advanceWinnerAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getStaff();
  if (!session.ok) return session.result;

  const matchId = str(formData, "match_id");
  const winnerParticipantId = str(formData, "participant_id");
  if (!matchId || !winnerParticipantId) return { ok: false, error: "Choose a winner." };

  const { data: match } = await session.supabase
    .from("matches")
    .select("id, next_match_id, tournament_id, tournament:tournaments(slug)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { ok: false, error: "Match not found." };
  if (!match.next_match_id) return { ok: false, error: "This is the final — there is no next match." };

  const { data: winner } = await session.supabase
    .from("match_participants")
    .select("registration_id, team_id, user_id")
    .eq("id", winnerParticipantId)
    .maybeSingle();
  if (!winner) return { ok: false, error: "Winner participant not found." };

  const { data: nextParticipants } = await session.supabase
    .from("match_participants")
    .select("id, slot")
    .eq("match_id", match.next_match_id);

  if (nextParticipants && nextParticipants.length >= 2) {
    return { ok: false, error: "The next match already has both participants." };
  }

  const usedSlots = new Set(((nextParticipants ?? []) as { slot: number | null }[]).map((row) => row.slot));
  const slot = usedSlots.has(1) ? 2 : 1;

  const { error } = await session.supabase.from("match_participants").insert({
    match_id: match.next_match_id,
    registration_id: winner.registration_id,
    team_id: winner.team_id,
    user_id: winner.user_id,
    slot,
  });
  if (error) return { ok: false, error: error.message };

  // Mark the loser eliminated.
  const { data: allParticipants } = await session.supabase
    .from("match_participants")
    .select("id")
    .eq("match_id", matchId);
  for (const participant of (allParticipants ?? []) as { id: string }[]) {
    if (participant.id !== winnerParticipantId) {
      await session.supabase.from("match_participants").update({ eliminated: true }).eq("id", participant.id);
    }
  }

  await writeAudit(session.supabase, session.user.id, "bracket.advance", "match", matchId, { winnerParticipantId });

  revalidatePath(`/admin/tournaments/${match.tournament_id}`);
  revalidatePath("/admin/matches");
  const slug = (match as unknown as { tournament?: { slug: string } }).tournament?.slug;
  if (slug) revalidatePath(`/tournaments/${slug}`);
  return { ok: true, data: null };
}
