"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@rjnx/shared";

export interface AdminNavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    superAdminOnly?: boolean;
  }[];
}

export function AdminNav({ groups, isSuperAdmin }: { groups: AdminNavGroup[]; isSuperAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-4" aria-label="Admin">
      {groups.map((group) => {
        const items = group.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
        if (!items.length) return null;
        return (
          <div key={group.label}>
            <p className="px-3 font-display text-[9px] font-bold uppercase tracking-[0.26em] text-white/30">
              {group.label}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 font-display text-[10px] font-bold uppercase tracking-[0.13em] transition-colors",
                        active
                          ? "bg-gradient-to-r from-rjnx-pink/20 to-transparent text-white shadow-[inset_2px_0_0_0_rgba(255,46,209,0.9)]"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/85",
                      )}
                    >
                      <span className={active ? "text-rjnx-pink" : ""}>{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-rjnx-blue px-1.5 text-[9px] font-bold text-black">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminRoleBadge({ roles }: { roles: Role[] }) {
  const label = roles.includes("super_admin")
    ? "Super admin"
    : roles.includes("admin")
      ? "Admin"
      : roles.includes("tournament_manager")
        ? "Tournament manager"
        : roles.includes("moderator")
          ? "Moderator"
          : "Player";
  return (
    <span className="rounded bg-rjnx-pink/15 px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-rjnx-pink">
      {label}
    </span>
  );
}
