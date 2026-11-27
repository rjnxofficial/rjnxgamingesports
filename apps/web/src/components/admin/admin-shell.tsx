import { AdminNav, AdminRoleBadge, type AdminNavGroup } from "./admin-nav";

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-display text-[9px] font-bold uppercase tracking-[0.32em] text-rjnx-pink">
          Command center
        </p>
        <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-[0.04em] text-white">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-rjnx-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-xl p-5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">{title}</h2>
          {description ? <p className="mt-1 text-xs text-rjnx-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export { AdminNav, AdminRoleBadge };
export type { AdminNavGroup };
