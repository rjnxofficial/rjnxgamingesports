import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
}

/**
 * Deliver notifications to Android devices registered in `rjnx.push_tokens`.
 * Best-effort: a push failure must never break the database write that
 * triggered it, so every error is swallowed and logged.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body?: string | null; link?: string | null },
): Promise<number> {
  if (!userIds.length) return 0;
  const admin = createAdminClient();
  if (!admin) return 0;

  const { data: tokens, error } = await admin
    .from("push_tokens")
    .select("token, user_id")
    .in("user_id", userIds.slice(0, 500));
  if (error || !tokens?.length) return 0;

  const messages: PushMessage[] = (tokens as { token: string; user_id: string }[])
    .filter((row) => row.token.startsWith("ExponentPushToken[") || row.token.startsWith("ExpoPushToken["))
    .map((row) => ({
      to: row.token,
      title: payload.title,
      body: payload.body ?? undefined,
      data: { link: payload.link ?? null, userId: row.user_id },
      sound: "default",
      channelId: "rjnx",
    }));
  if (!messages.length) return 0;

  let delivered = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) continue;
      const result = (await response.json()) as { data?: { status?: string; details?: { error?: string } }[] };
      const receipts = result.data ?? [];
      delivered += receipts.filter((receipt) => receipt.status === "ok").length;

      // Prune tokens Expo reports as unregistered so the table stays honest.
      const dead = receipts
        .map((receipt, index) =>
          receipt.details?.error === "DeviceNotRegistered" ? chunk[index]?.to : undefined,
        )
        .filter((token): token is string => Boolean(token));
      if (dead.length) await admin.from("push_tokens").delete().in("token", dead);
    } catch {
      // network hiccup — the in-app notification row still exists
      return delivered;
    }
  }
  return delivered;
}
