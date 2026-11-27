import { Bell } from "lucide-react";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { BroadcastForm } from "./broadcast-form";
import { requireStaff } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await requireStaff("/admin/notifications");

  const [{ data: tournaments }, { data: recent }] = await Promise.all([
    session.supabase.from("tournaments").select("id, name").in("status", ["published", "registration_open", "registration_closed", "live"]).order("starts_at", { ascending: false }).limit(50),
    session.supabase
      .from("notifications")
      .select("id, type, title, created_at, user:profiles(username)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <AdminHeader title="Broadcast" subtitle="Send in-app and push notifications to all players, staff or a specific tournament lobby." />

      <AdminPanel title="Compose broadcast" description="Every recipient gets a notification row; the Android app receives the same alerts as push.">
        <BroadcastForm tournaments={(tournaments ?? []) as { id: string; name: string }[]} />
      </AdminPanel>

      <AdminPanel title="Recently sent">
        {recent?.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {(recent as unknown as { id: string; type: string; title: string; created_at: string; user: { username: string } | null }[]).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <Bell className="size-3 text-rjnx-pink/70" />
                  <span className="text-white/80">{row.title}</span>
                  <span className="text-white/30">{row.type}</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                  {row.user?.username ?? "player"} · {formatDate(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-rjnx-muted">No notifications sent yet.</p>
        )}
      </AdminPanel>
    </div>
  );
}
