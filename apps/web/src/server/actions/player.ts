"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  invitationSchema,
  profileUpdateSchema,
  supportTicketSchema,
  teamSchema,
  type ApiResult,
} from "@rjnx/shared";
import { getSessionContext } from "@/server/auth";
import { writeAudit, notifyUser } from "@/server/audit";
import { createAdminClient } from "@/lib/supabase/admin";

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string | undefined | null): string | null {
  return value && value.length ? value : null;
}

/* ------------------------------------------------------------- profile */

export async function updateProfileAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in to update your profile." };

  const parsed = profileUpdateSchema.safeParse({
    full_name: str(formData, "full_name"),
    phone: str(formData, "phone"),
    country: str(formData, "country"),
    state: str(formData, "state"),
    bio: str(formData, "bio"),
    in_game_name: str(formData, "in_game_name"),
    game_uid: str(formData, "game_uid"),
    primary_game_id: emptyToNull(str(formData, "primary_game_id")),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid profile data", field: issue?.path.join(".") };
  }

  const { error } = await session.supabase
    .from("profiles")
    .update({
      full_name: emptyToNull(parsed.data.full_name ?? null),
      phone: emptyToNull(parsed.data.phone ?? null),
      country: emptyToNull(parsed.data.country ?? null),
      state: emptyToNull(parsed.data.state ?? null),
      bio: emptyToNull(parsed.data.bio ?? null),
      in_game_name: emptyToNull(parsed.data.in_game_name ?? null),
      game_uid: emptyToNull(parsed.data.game_uid ?? null),
      primary_game_id: parsed.data.primary_game_id ?? null,
    })
    .eq("id", session.user.id);

  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "profile.update", "profile", session.user.id);
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

export async function updateUsernameAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const parsed = z
    .object({ username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, _ and . only") })
    .safeParse({ username: str(formData, "username") });

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };

  const { data: taken } = await session.supabase
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .neq("id", session.user.id)
    .maybeSingle();
  if (taken) return { ok: false, error: "That username is already taken", field: "username" };

  const { error } = await session.supabase
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", session.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  return { ok: true, data: null };
}

export async function updateAvatarAction(formData: FormData): Promise<ApiResult<{ url: string }>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image file." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Avatar must be smaller than 2 MB." };

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return { ok: false, error: "Use a PNG, JPG or WebP image." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await session.supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}. Ask an admin to create the "avatars" storage bucket.` };
  }

  const { data: publicUrl } = session.supabase.storage.from("avatars").getPublicUrl(path);

  const { error } = await session.supabase
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", session.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath("/", "layout");
  return { ok: true, data: { url: publicUrl.publicUrl } };
}

/* ---------------------------------------------------------------- teams */

export async function createTeamAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in to create a team." };

  const parsed = teamSchema.safeParse({
    name: str(formData, "name"),
    tag: str(formData, "tag"),
    game_id: emptyToNull(str(formData, "game_id")),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid team", field: issue?.path.join(".") };
  }

  const { data: existingMembership } = await session.supabase
    .from("team_members")
    .select("team_id, team:teams(name)")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (existingMembership) {
    return {
      ok: false,
      error: `You are already in ${(existingMembership as { team?: { name?: string } }).team?.name ?? "a team"}. Leave it before creating a new one.`,
    };
  }

  const { data: team, error } = await session.supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      tag: emptyToNull(parsed.data.tag ?? null),
      game_id: parsed.data.game_id ?? null,
      captain_id: session.user.id,
    })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "A team with that name already exists.", field: "name" };
    return { ok: false, error: error.message };
  }

  const { error: memberError } = await session.supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: session.user.id, role: "captain" });
  if (memberError) return { ok: false, error: memberError.message };

  await writeAudit(session.supabase, session.user.id, "team.create", "team", team.id, { name: team.name });
  revalidatePath("/dashboard/teams");
  revalidatePath("/teams");
  return { ok: true, data: null };
}

export async function updateTeamAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };
  const teamId = str(formData, "team_id");
  if (!teamId) return { ok: false, error: "Missing team." };

  const parsed = teamSchema.safeParse({
    name: str(formData, "name"),
    tag: str(formData, "tag"),
    game_id: emptyToNull(str(formData, "game_id")),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid team", field: issue?.path.join(".") };
  }

  const { error } = await session.supabase
    .from("teams")
    .update({
      name: parsed.data.name,
      tag: emptyToNull(parsed.data.tag ?? null),
      game_id: parsed.data.game_id ?? null,
    })
    .eq("id", teamId)
    .eq("captain_id", session.user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "A team with that name already exists.", field: "name" };
    return { ok: false, error: error.message };
  }

  await writeAudit(session.supabase, session.user.id, "team.update", "team", teamId);
  revalidatePath("/dashboard/teams");
  revalidatePath("/teams");
  return { ok: true, data: null };
}

export async function disbandTeamAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };
  const teamId = str(formData, "team_id");

  const { error } = await session.supabase.from("teams").delete().eq("id", teamId).eq("captain_id", session.user.id);
  if (error) return { ok: false, error: error.message };

  await writeAudit(session.supabase, session.user.id, "team.disband", "team", teamId);
  revalidatePath("/dashboard/teams");
  revalidatePath("/teams");
  return { ok: true, data: null };
}

export async function inviteMemberAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const parsed = invitationSchema.safeParse({
    team_id: str(formData, "team_id"),
    username: str(formData, "username"),
    message: str(formData, "message"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid invitation", field: issue?.path.join(".") };
  }

  const { data: team } = await session.supabase
    .from("teams")
    .select("id, name, captain_id")
    .eq("id", parsed.data.team_id)
    .maybeSingle();
  if (!team || team.captain_id !== session.user.id) return { ok: false, error: "Only the captain can invite players." };

  const { data: invitee } = await session.supabase
    .from("profiles")
    .select("id, username, is_suspended")
    .ilike("username", parsed.data.username)
    .maybeSingle();
  if (!invitee) return { ok: false, error: "No player found with that username.", field: "username" };
  if (invitee.id === session.user.id) return { ok: false, error: "You cannot invite yourself." };
  if (invitee.is_suspended) return { ok: false, error: "That player is suspended." };

  const { error } = await session.supabase.from("team_invitations").insert({
    team_id: team.id,
    inviter_id: session.user.id,
    invitee_id: invitee.id,
    message: emptyToNull(parsed.data.message ?? null),
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "An invitation is already pending for that player." };
    return { ok: false, error: error.message };
  }

  await notifyUser(
    session.supabase,
    invitee.id,
    "team",
    `Team invitation: ${team.name}`,
    `${session.profile?.username ?? "A captain"} invited you to join ${team.name}.`,
    "/dashboard/teams",
  );

  revalidatePath("/dashboard/teams");
  return { ok: true, data: null };
}

export async function respondInvitationAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const invitationId = str(formData, "invitation_id");
  const decision = str(formData, "decision") === "accept" ? "accepted" : "rejected";
  if (!invitationId) return { ok: false, error: "Missing invitation." };

  const { data: invitation, error: fetchError } = await session.supabase
    .from("team_invitations")
    .select("id, team_id, invitee_id, status, team:teams(name, captain_id)")
    .eq("id", invitationId)
    .maybeSingle();

  if (fetchError || !invitation) return { ok: false, error: "Invitation not found." };
  if (invitation.invitee_id !== session.user.id) return { ok: false, error: "This invitation is not for you." };
  if (invitation.status !== "pending") return { ok: false, error: "That invitation was already handled." };

  if (decision === "accepted") {
    const { data: existing } = await session.supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (existing) return { ok: false, error: "Leave your current team before joining another." };

    const { data: teamInfo } = await session.supabase
      .from("teams")
      .select("id, game_id")
      .eq("id", invitation.team_id)
      .maybeSingle();

    const { error: joinError } = await session.supabase
      .from("team_members")
      .insert({ team_id: invitation.team_id, user_id: session.user.id, role: "member" });
    if (joinError) {
      if (joinError.code === "23505") return { ok: false, error: "You are already in a team." };
      return { ok: false, error: joinError.message };
    }

    // Sync the player's primary game with the team's game when unset.
    if (teamInfo?.game_id) {
      await session.supabase
        .from("profiles")
        .update({ primary_game_id: teamInfo.game_id })
        .eq("id", session.user.id)
        .is("primary_game_id", null);
    }
  }

  const { error } = await session.supabase
    .from("team_invitations")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) return { ok: false, error: error.message };

  const teamName = (invitation as unknown as { team?: { name?: string } }).team?.name ?? "the team";
  const admin = createAdminClient();
  if (admin) {
    await admin.from("notifications").insert({
      user_id: (invitation as unknown as { team?: { captain_id?: string } }).team?.captain_id ?? session.user.id,
      type: "team",
      title: decision === "accepted" ? "Invitation accepted" : "Invitation declined",
      body: `${session.profile?.username ?? "A player"} ${decision === "accepted" ? "joined" : "declined"} ${teamName}.`,
      link: "/dashboard/teams",
    });
  }

  revalidatePath("/dashboard/teams");
  revalidatePath("/teams");
  return { ok: true, data: null };
}

export async function removeMemberAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const teamId = str(formData, "team_id");
  const memberId = str(formData, "user_id");
  if (!teamId || !memberId) return { ok: false, error: "Missing member." };
  if (memberId === session.user.id && !str(formData, "leave")) {
    return { ok: false, error: "Captains must transfer or disband the team." };
  }

  const { data: team } = await session.supabase
    .from("teams")
    .select("captain_id, name")
    .eq("id", teamId)
    .maybeSingle();
  if (!team) return { ok: false, error: "Team not found." };

  const isSelf = memberId === session.user.id;
  if (!isSelf && team.captain_id !== session.user.id && !session.isStaff) {
    return { ok: false, error: "Only the captain can remove members." };
  }
  if (memberId === team.captain_id && isSelf) {
    return { ok: false, error: "Transfer captaincy or disband the team instead." };
  }

  const { error } = await session.supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", memberId);
  if (error) return { ok: false, error: error.message };

  await notifyUser(session.supabase, memberId, "team", `Removed from ${team.name}`, "You are no longer part of this team.", "/dashboard/teams");
  revalidatePath("/dashboard/teams");
  revalidatePath("/teams");
  return { ok: true, data: null };
}

export async function transferCaptainAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const teamId = str(formData, "team_id");
  const newCaptainId = str(formData, "user_id");

  const { data: team } = await session.supabase.from("teams").select("captain_id").eq("id", teamId).maybeSingle();
  if (!team || team.captain_id !== session.user.id) return { ok: false, error: "Only the captain can transfer captaincy." };

  const { data: membership } = await session.supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", newCaptainId)
    .maybeSingle();
  if (!membership) return { ok: false, error: "That player is not on this team." };

  const { error: teamError } = await session.supabase
    .from("teams")
    .update({ captain_id: newCaptainId })
    .eq("id", teamId);
  if (teamError) return { ok: false, error: teamError.message };

  await session.supabase.from("team_members").update({ role: "member" }).eq("team_id", teamId).eq("user_id", session.user.id);
  await session.supabase.from("team_members").update({ role: "captain" }).eq("team_id", teamId).eq("user_id", newCaptainId);

  revalidatePath("/dashboard/teams");
  return { ok: true, data: null };
}

/* -------------------------------------------------------------- support */

export async function createSupportTicketAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in to open a support ticket." };

  const parsed = supportTicketSchema.safeParse({
    subject: str(formData, "subject"),
    category: str(formData, "category") || "other",
    message: str(formData, "message"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid ticket", field: issue?.path.join(".") };
  }

  const { error } = await session.supabase.from("support_tickets").insert({
    user_id: session.user.id,
    subject: parsed.data.subject,
    category: parsed.data.category,
    message: parsed.data.message,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/support");
  revalidatePath("/dashboard/support");
  return { ok: true, data: null };
}

/* -------------------------------------------------------- notifications */

export async function markNotificationsReadAction(): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const { error } = await session.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/notifications");
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function deleteNotificationAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };
  const id = str(formData, "notification_id");
  const { error } = await session.supabase.from("notifications").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true, data: null };
}

export async function registerPushTokenAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const token = str(formData, "token");
  const platformus = str(formData, "platform") || "android";
  if (!token) return { ok: false, error: "Missing push token." };
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };
  const { error } = await session.supabase
    .from("push_tokens")
    .upsert({ user_id: session.user.id, token, platform: platformus }, { onConflict: "token" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
