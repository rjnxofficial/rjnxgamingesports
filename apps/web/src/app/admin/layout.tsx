import Link from "next/link";
import {
  Activity, BarChart3, Bell, ClipboardCheck, FileText, ImageIcon, LayoutDashboard, ListChecks, MessageSquare,
  Settings, ShieldCheck, Swords, Trophy, Users, UserCog, Gamepad2,
} from "lucide-react";
import { LogoMark } from "@/components/site/logo";
import { AdminNav, AdminRoleBadge, type AdminNavGroup } from "@/components/admin/admin-shell";
import { requireStaff } from "@/server/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff("/admin");
  const supabase = await createServerSupabase();

  const [{ count: pendingRegistrations }, { count: pendingResults }, { count: openTickets }] = await Promise.all([
    supabase.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("match_results").select("id", { count: "exact", head: true }).eq("is_verified", false),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  const groups: AdminNavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="size-3.5" /> },
        { href: "/admin/reports", label: "Reports", icon: <BarChart3 className="size-3.5" /> },
      ],
    },
    {
      label: "Competition",
      items: [
        { href: "/admin/tournaments", label: "Tournaments", icon: <Trophy className="size-3.5" /> },
        { href: "/admin/registrations", label: "Registrations", icon: <ListChecks className="size-3.5" />, badge: pendingRegistrations ?? 0 },
        { href: "/admin/matches", label: "Matches & rooms", icon: <Swords className="size-3.5" /> },
        { href: "/admin/results", label: "Result verification", icon: <ClipboardCheck className="size-3.5" />, badge: pendingResults ?? 0 },
        { href: "/admin/leaderboard", label: "Leaderboards", icon: <Gamepad2 className="size-3.5" /> },
      ],
    },
    {
      label: "Community",
      items: [
        { href: "/admin/users", label: "Users", icon: <Users className="size-3.5" /> },
        { href: "/admin/roles", label: "Roles & permissions", icon: <UserCog className="size-3.5" />, superAdminOnly: true },
        { href: "/admin/support", label: "Support tickets", icon: <MessageSquare className="size-3.5" />, badge: openTickets ?? 0 },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/admin/news", label: "News", icon: <FileText className="size-3.5" /> },
        { href: "/admin/banners", label: "Banners", icon: <ImageIcon className="size-3.5" /> },
        { href: "/admin/notifications", label: "Broadcast", icon: <Bell className="size-3.5" /> },
      ],
    },
    {
      label: "System",
      items: [
        { href: "/admin/settings", label: "Platform settings", icon: <Settings className="size-3.5" />, superAdminOnly: true },
        { href: "/admin/audit", label: "Audit logs", icon: <Activity className="size-3.5" />, superAdminOnly: true },
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-rjnx-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-display text-[11px] font-black uppercase tracking-[0.22em] text-white">
              RJNX <span className="text-rjnx-pink">Admin</span>
            </span>
          </Link>
          <AdminRoleBadge roles={session.roles} />
          <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{session.profile?.username}</span>
            <Link href="/dashboard" className="rounded border border-white/10 px-2 py-1 hover:border-rjnx-blue/40 hover:text-white">
              Player view
            </Link>
            <Link href="/" className="rounded border border-white/10 px-2 py-1 hover:border-rjnx-blue/40 hover:text-white">
              Site
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="lg:sticky lg:top-20">
            <AdminNav groups={groups} isSuperAdmin={session.isSuperAdmin} />
            {!session.isSuperAdmin ? (
              <p className="mt-4 flex items-start gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-white/35">
                <ShieldCheck className="mt-0.5 size-3 shrink-0" />
                Roles, platform settings and audit logs are restricted to super admins.
              </p>
            ) : null}
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
