"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Menu, Settings, Shield, User, X } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";

export interface HeaderUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  roles: string[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  unreadCount: number;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/results", label: "Results" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
  { href: "/news", label: "News" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
];

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-white/[0.07] bg-rjnx-bg/85 backdrop-blur-xl"
          : "border-transparent bg-gradient-to-b from-black/60 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="RJNX GAMING ESPORTS home">
          <Logo size={34} />
        </Link>

        <nav className="ml-6 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative rounded-md px-2.5 py-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
                isActive(link.href) ? "text-white" : "text-white/50 hover:text-white/90",
              )}
            >
              {link.label}
              {isActive(link.href) ? (
                <span className="absolute inset-x-2 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-rjnx-blue to-transparent" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative hidden rounded-md p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white sm:block"
                aria-label={`Notifications${user.unreadCount ? `, ${user.unreadCount} unread` : ""}`}
              >
                <Bell className="size-4" />
                {user.unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rjnx-pink px-1 text-[9px] font-bold text-black">
                    {user.unreadCount > 9 ? "9+" : user.unreadCount}
                  </span>
                ) : null}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 transition-colors hover:border-rjnx-blue/40"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-[10px] font-black text-black">
                    {user.avatarUrl ? (
                       
                      <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      initials(user.username)
                    )}
                  </span>
                  <span className="hidden max-w-24 truncate font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/85 sm:block">
                    {user.username}
                  </span>
                  <ChevronDown className="size-3 text-white/40" />
                </button>

                {menuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default"
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="glass absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg p-1.5"
                    >
                      <div className="border-b border-white/[0.07] px-2.5 pb-2 pt-1">
                        <p className="truncate font-display text-xs font-bold text-white">{user.username}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} tone={role === "super_admin" ? "pink" : "blue"}>
                              {role.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <MenuItem href="/dashboard" icon={<LayoutDashboard className="size-4" />} label="Dashboard" />
                      <MenuItem href="/dashboard/profile" icon={<User className="size-4" />} label="My profile" />
                      <MenuItem href="/dashboard/settings" icon={<Settings className="size-4" />} label="Settings" />
                      {user.isStaff ? (
                        <MenuItem href="/admin" icon={<Shield className="size-4" />} label="Command center" />
                      ) : null}
                      <button
                        type="button"
                        onClick={signOut}
                        className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-rjnx-red transition-colors hover:bg-rjnx-red/10"
                        role="menuitem"
                      >
                        <LogOut className="size-4" /> Sign out
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login">
                <Button variant="ghost" size="sm" shape="pill">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" shape="pill">
                  Join RJNX
                </Button>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="rounded-md p-2 text-white/70 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/[0.07] bg-rjnx-bg/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <nav className="grid grid-cols-2 gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.14em]",
                  isActive(link.href) ? "bg-white/8 text-white" : "text-white/60",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {!user ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="w-full">Join RJNX</Button>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
