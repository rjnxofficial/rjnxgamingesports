import { Bell, Gamepad2, LayoutDashboard, LifeBuoy, Settings, Shield, Trophy, User, Users } from "lucide-react";
import { SiteHeader, type HeaderUser } from "@/components/site/site-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/server/auth";
import { ROLE_LABELS } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser("/dashboard");

  const { data: unread } = await session.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  const { data: invites } = await session.supabase
    .from("team_invitations")
    .select("id", { count: "exact", head: true })
    .eq("invitee_id", session.user.id)
    .eq("status", "pending");

  const headerUser: HeaderUser = {
    id: session.user.id,
    username: session.profile?.username ?? "player",
    avatarUrl: session.profile?.avatar_url ?? null,
    roles: session.roles,
    isStaff: session.isStaff,
    isSuperAdmin: session.isSuperAdmin,
    unreadCount: unread?.length ?? 0,
  };

  const primaryRole = session.roles.includes("super_admin")
    ? "super_admin"
    : session.roles.includes("admin")
      ? "admin"
      : session.roles.includes("tournament_manager")
        ? "tournament_manager"
        : session.roles.includes("moderator")
          ? "moderator"
          : "player";

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader user={headerUser} />
        <main className="flex-1">
          <DashboardShell
            activePath=""
            roleLabel={ROLE_LABELS[primaryRole]}
            identity={{
              name: session.profile?.full_name ?? session.profile?.username ?? "Player",
              handle: session.profile?.username ?? "player",
              avatarUrl: session.profile?.avatar_url ?? null,
            }}
            items={[
              { href: "/dashboard", label: "Overview", icon: <LayoutDashboard className="size-3.5" /> },
              { href: "/dashboard/tournaments", label: "My tournaments", icon: <Trophy className="size-3.5" /> },
              { href: "/dashboard/matches", label: "My matches", icon: <Gamepad2 className="size-3.5" /> },
              { href: "/dashboard/teams", label: "Teams", icon: <Users className="size-3.5" />, badge: invites?.length ?? 0 },
              { href: "/dashboard/notifications", label: "Notifications", icon: <Bell className="size-3.5" />, badge: unread?.length ?? 0 },
              { href: "/dashboard/profile", label: "Profile", icon: <User className="size-3.5" /> },
              { href: "/dashboard/settings", label: "Settings", icon: <Settings className="size-3.5" /> },
              { href: "/dashboard/support", label: "Support", icon: <LifeBuoy className="size-3.5" /> },
              ...(session.isStaff
                ? [{ href: "/admin", label: "Command center", icon: <Shield className="size-3.5" /> }]
                : []),
            ]}
          >
            {children}
          </DashboardShell>
        </main>
    </div>
  );
}
