import "server-only";
import type { RjnxClient } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/expo";

/** Write an audit log entry. Degrades gracefully if the RLS client is used. */
export async function writeAudit(
  supabase: RjnxClient,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  const payload = {
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  };
  const { error } = await supabase.from("audit_logs").insert(payload);
  if (!error) return;
  const admin = createAdminClient();
  if (admin) await admin.from("audit_logs").insert(payload);
}

/** Create a notification row. Falls back to the service role for fan-out. */
export async function notifyUser(
  supabase: RjnxClient,
  userId: string,
  type:
    | "registration"
    | "approval"
    | "match"
    | "room"
    | "result"
    | "winner"
    | "team"
    | "announcement"
    | "admin"
    | "payment"
    | "system",
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<void> {
  const payload = { user_id: userId, type, title, body: body ?? null, link: link ?? null };
  const { error } = await supabase.from("notifications").insert(payload);
  if (error) {
    const admin = createAdminClient();
    if (admin) await admin.from("notifications").insert(payload);
  }
  // Mirror to Android push devices (no-op when the player has no installed app).
  await sendPushToUsers([userId], { title, body, link });
}

/** Broadcast a notification to a list of user ids (service role required). */
export async function notifyMany(
  userIds: string[],
  type: "announcement" | "admin" | "system" | "match" | "result" | "winner" | "room" | "team" | "registration" | "approval" | "payment",
  title: string,
  body?: string | null,
  link?: string | null,
): Promise<number> {
  if (!userIds.length) return 0;
  const admin = createAdminClient();
  if (!admin) return 0;
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
  }));
  // chunk to stay well under request limits
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await admin.from("notifications").insert(chunk);
    if (!error) inserted += chunk.length;
  }
  if (inserted) await sendPushToUsers(userIds, { title, body, link });
  return inserted;
}
