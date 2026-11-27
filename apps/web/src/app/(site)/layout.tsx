import { SiteHeader, type HeaderUser } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getSessionContext } from "@/server/auth";

export const dynamic = "force-dynamic";

async function getHeaderUser(): Promise<HeaderUser | null> {
  const context = await getSessionContext();
  if (!context) return null;

  const { count } = await context.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.user.id)
    .eq("is_read", false);

  return {
    id: context.user.id,
    username: context.profile?.username ?? context.user.email?.split("@")[0] ?? "player",
    avatarUrl: context.profile?.avatar_url ?? null,
    roles: context.roles,
    isStaff: context.isStaff,
    isSuperAdmin: context.isSuperAdmin,
    unreadCount: count ?? 0,
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-rjnx-blue/15 bg-gradient-to-r from-rjnx-purple/10 via-rjnx-blue/5 to-rjnx-pink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-1.5 text-center font-display text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
          <span className="hidden size-1.5 animate-pulse rounded-full bg-rjnx-pink sm:block" />
          Season 4 registration is open — ₹2,50,000 prize circuit
        </div>
      </div>
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
