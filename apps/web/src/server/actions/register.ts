"use server";

import { revalidatePath } from "next/cache";
import { registrationSchema, type ApiResult } from "@rjnx/shared";
import { getSessionContext } from "@/server/auth";
import { writeAudit } from "@/server/audit";

const RPC_ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to register.",
  PROFILE_MISSING: "Your player profile is still being created. Refresh in a moment.",
  ACCOUNT_SUSPENDED: "Your account is suspended. Contact support.",
  TOURNAMENT_NOT_FOUND: "That tournament no longer exists.",
  REGISTRATION_CLOSED: "Registration is closed for this tournament.",
  REGISTRATION_NOT_STARTED: "Registration has not opened yet.",
  ALREADY_REGISTERED: "You are already registered for this tournament.",
  TEAM_REQUIRED: "This is a team event — select or create a team first.",
  NOT_A_TEAM_MEMBER: "You are not a member of that team.",
  INVALID_TEAM_SIZE: "Your team size does not match the tournament format.",
  TEAM_ALREADY_REGISTERED: "That team is already registered for this tournament.",
  TOURNAMENT_FULL: "All slots are taken. Watch for a new lobby.",
  TOURNAMENT_LOCKED: "This tournament is live — cancellations are locked.",
  NOT_ELIGIBLE: "You are not eligible for this action.",
};

function friendlyError(message: string): string {
  const key = Object.keys(RPC_ERRORS).find((code) => message.includes(code));
  return key ? RPC_ERRORS[key]! : message;
}

export async function registerForTournamentAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in to register for tournaments." };
  if (session.profile?.is_suspended) return { ok: false, error: "Your account is suspended." };

  const teamIdRaw = formData.get("team_id");
  const parsed = registrationSchema.safeParse({
    tournament_id: formData.get("tournament_id"),
    team_id: typeof teamIdRaw === "string" && teamIdRaw.length ? teamIdRaw : null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid registration" };
  }
  // Registration must be driven by the authenticated session only.
  void teamIdRaw;

  const { data: tournament } = await session.supabase
    .from("tournaments")
    .select("slug, name, mode, min_team_size, max_team_size")
    .eq("id", parsed.data.tournament_id)
    .maybeSingle();

  if (!tournament) return { ok: false, error: "Tournament not found." };

  if (tournament.mode !== "solo" && !parsed.data.team_id) {
    return { ok: false, error: "Select a team for this team-format tournament.", field: "team_id" };
  }

  const { data, error } = await session.supabase.rpc("register_for_tournament", {
    p_tournament_id: parsed.data.tournament_id,
    p_team_id: parsed.data.team_id ?? null,
  });

  if (error) {
    return { ok: false, error: friendlyError(error.message) };
  }

  await writeAudit(session.supabase, session.user.id, "registration.create", "tournament_registration", null, {
    tournament_id: parsed.data.tournament_id,
    team_id: parsed.data.team_id ?? null,
  });

  revalidatePath(`/tournaments/${tournament.slug}`);
  revalidatePath("/tournaments");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tournaments");

  void data;
  return { ok: true, data: null };
}

export async function cancelRegistrationAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const session = await getSessionContext();
  if (!session) return { ok: false, error: "Sign in first." };

  const registrationId = String(formData.get("registration_id") ?? "");
  if (!registrationId) return { ok: false, error: "Missing registration." };

  const { error } = await session.supabase.rpc("cancel_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, error: friendlyError(error.message) };

  await writeAudit(session.supabase, session.user.id, "registration.cancel", "tournament_registration", registrationId);

  revalidatePath("/tournaments");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tournaments");
  return { ok: true, data: null };
}
