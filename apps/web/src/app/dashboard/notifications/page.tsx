import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { requireUser } from "@/server/auth";
import { deleteNotificationAction, markNotificationsReadAction } from "@/server/actions/player";
import { relativeTime } from "@rjnx/shared";

export const dynamic = "force-dynamic";

const TONE: Record<string, "blue" | "purple" | "pink" | "green" | "amber" | "neutral"> = {
  registration: "blue",
  approval: "green",
  match: "purple",
  room: "pink",
  result: "green",
  winner: "amber",
  team: "purple",
  announcement: "blue",
  admin: "pink",
  payment: "green",
  system: "neutral",
};

export default async function NotificationsPage() {
  const session = await requireUser("/dashboard/notifications");

  const { data } = await session.supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  const rows = (data ?? []) as { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }[];
  const unread = rows.filter((row) => !row.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={`${unread} unread of ${rows.length} total.`}
        actions={
          unread ? (
            <ActionButton action={markNotificationsReadAction} fields={{}} label="Mark all read" variant="secondary" size="sm" />
          ) : null
        }
      />

      {rows.length ? (
        <div className="space-y-2">
          {rows.map((note) => (
            <Card key={note.id} className={`p-4 ${note.is_read ? "opacity-70" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[note.type] ?? "neutral"}>{note.type}</Badge>
                    {!note.is_read ? <span className="size-1.5 rounded-full bg-rjnx-pink" /> : null}
                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{relativeTime(note.created_at)}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-white">{note.title}</p>
                  {note.body ? <p className="mt-0.5 text-sm text-white/55">{note.body}</p> : null}
                  {note.link ? (
                    <Link href={note.link} className="mt-2 inline-block text-xs text-rjnx-blue hover:underline">
                      Open →
                    </Link>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <ActionButton action={deleteNotificationAction} fields={{ notification_id: note.id }} label="" variant="ghost" size="icon" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Inbox empty"
          description="Registration confirmations, room drops, results and announcements all land here."
          icon={<Bell className="size-6" />}
        />
      )}

      <p className="flex items-center gap-2 text-[11px] text-white/30">
        <CheckCheck className="size-3" /> The Android app receives the same notifications as push alerts.
        <Trash2 className="ml-2 size-3" /> Deleting removes it from your account permanently.
      </p>
    </div>
  );
}
