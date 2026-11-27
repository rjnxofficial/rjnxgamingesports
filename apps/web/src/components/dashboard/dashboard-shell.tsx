import Link from "next/link";
import { LogoMark } from "@/components/site/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function DashboardShell({
  children,
  items,
  activePath,
  roleLabel,
  identity,
}: {
  children: React.ReactNode;
  items: DashboardNavItem[];
  activePath: string;
  roleLabel: string;
  identity: { name: string; handle: string; avatarUrl: string | null };
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-[11px] font-black text-black">
                {identity.avatarUrl ? (
                   
                  <img src={identity.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  identity.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xs font-bold text-white">{identity.name}</p>
                <p className="truncate text-[10px] text-white/40">@{identity.handle}</p>
              </div>
            </div>
            <Badge tone="blue" className="mt-2">{roleLabel}</Badge>
          </div>

          <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:hidden" aria-label="Dashboard">
            {items.map((item) => {
              const active = activePath === item.href || (item.href !== "/dashboard" && activePath.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 font-display text-[10px] uppercase tracking-[0.12em]",
                    active ? "border-rjnx-blue/40 bg-rjnx-blue/10 text-white" : "border-white/10 text-white/50",
                  )}
                >
                  {item.icon}
                  {item.label}
                  {item.badge ? (
                    <span className="rounded-full bg-rjnx-pink px-1 text-[9px] font-bold text-black">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <nav className="hidden space-y-0.5 lg:block" aria-label="Dashboard">
            {items.map((item) => {
              const active = activePath === item.href || (item.href !== "/dashboard" && activePath.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "bg-gradient-to-r from-rjnx-blue/20 to-transparent text-white shadow-[inset_2px_0_0_0_rgba(0,207,255,0.8)]"
                      : "text-white/45 hover:bg-white/[0.04] hover:text-white/80",
                  )}
                >
                  <span className={active ? "text-rjnx-blue" : ""}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-rjnx-pink px-1.5 text-[9px] font-bold text-black">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
            <Link
              href="/"
              className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/35 hover:text-white/70"
            >
              <LogoMark size={16} /> Public site
            </Link>
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.3em] text-rjnx-blue">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-[0.04em] text-white">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-rjnx-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
