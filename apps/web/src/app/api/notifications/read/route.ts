import { NextResponse } from "next/server";
import { getSessionContext } from "@/server/auth";

export const dynamic = "force-dynamic";

/** Marks every unread notification as read for the current session. */
export async function POST() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await session.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
