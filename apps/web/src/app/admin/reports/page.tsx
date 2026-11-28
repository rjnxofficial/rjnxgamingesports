import Link from "next/link";
import { BarChart3, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, StatCard } from "@/components/ui/card";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { requireStaff } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatNumber } from "@rjnx/shared";

export const dynamic = "force-dynamic";

/** Inclusive `YYYY-MM-DD` range from the URL, defaulting to the last 30 days. */
function resolveRange(searchParams: { from?: string; to?: string }) {
  const iso = (value: string | undefined, fallback: Date) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback.toISOString().slice(0, 10);
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const from = iso(searchParams.from, monthAgo);
  const to = iso(searchParams.to, today);
  return {
    from,
    to,
    fromIso: new Date(`${from}T00:00:00.000Z`).toISOString(),
    toIso: new Date(`${to}T23:59:59.999Z`).toISOString(),
  };
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireStaff("/admin/reports");
  const client = createAdminClient() ?? session.supabase;
  const range = resolveRange(await searchParams);

  const [{ data: statsRaw }, { data: byGame }, { data: byTournament }, { data: payments }] = await Promise.all([
    session.supabase.rpc("admin_stats"),
    client
      .from("tournaments")
      .select("game_id, prize_pool, entry_fee, status, game:games(name, short_name)")
      .neq("status", "draft")
      .gte("starts_at", range.fromIso)
      .lte("starts_at", range.toIso),
    client
      .from("tournaments")
      .select("id, name, status, max_slots, prize_pool, entry_fee, starts_at, registrations:tournament_registrations(id, status)")
      .neq("status", "draft")
      .gte("starts_at", range.fromIso)
      .lte("starts_at", range.toIso)
      .order("starts_at", { ascending: false })
      .limit(20),
    client
      .from("payment_transactions")
      .select("amount, status, created_at")
      .gte("created_at", range.fromIso)
      .lte("created_at", range.toIso)
      .limit(1000),
  ]);

  const stats = (statsRaw ?? {}) as {
    total_users?: number;
    total_registrations?: number;
    total_revenue?: number;
    total_tournaments?: number;
  };

  const gameRows = (byGame ?? []) as unknown as {
    game_id: string;
    prize_pool: number;
    entry_fee: number;
    status: string;
    game: { name: string; short_name: string } | null;
  }[];

  const gameAgg = new Map<string, { name: string; tournaments: number; prize: number; live: number }>();
  for (const row of gameRows) {
    const key = row.game?.short_name ?? "Other";
    const current = gameAgg.get(key) ?? { name: row.game?.name ?? "Other", tournaments: 0, prize: 0, live: 0 };
    current.tournaments += 1;
    current.prize += Number(row.prize_pool ?? 0);
    if (row.status === "live") current.live += 1;
    gameAgg.set(key, current);
  }

  const tournamentRows = (byTournament ?? []) as unknown as {
    id: string;
    name: string;
    status: string;
    max_slots: number;
    prize_pool: number;
    entry_fee: number;
    starts_at: string;
    registrations: { id: string; status: string }[];
  }[];

  const paidPayments = ((payments ?? []) as { amount: number; status: string }[]).filter((row) => row.status === "paid");
  const revenue = paidPayments.reduce((sum, row) => sum + Number(row.amount), 0);
  const conversion = gameRows.length ? Math.round((gameRows.filter((row) => row.status === "completed").length / gameRows.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <AdminHeader title="Reports & analytics" subtitle="Live aggregation from the rjnx schema — no cached or hardcoded values." />

      <AdminPanel title="Date range & exports" description={`Showing ${range.from} → ${range.to}. Exports respect this range.`}>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rjnx-muted">
            From
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-normal tracking-normal text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rjnx-muted">
            To
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-normal tracking-normal text-white"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-rjnx-blue/40 bg-rjnx-blue/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-rjnx-blue hover:bg-rjnx-blue/20"
          >
            Apply
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["registrations", "payments", "tournaments", "results", "users"] as const).map((dataset) => (
            <Link
              key={dataset}
              href={`/admin/reports/export?dataset=${dataset}&from=${range.from}&to=${range.to}`}
              prefetch={false}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 hover:border-rjnx-blue/40 hover:text-rjnx-blue"
            >
              Export {dataset} CSV
            </Link>
          ))}
        </div>
      </AdminPanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={formatNumber(stats.total_users ?? 0)} icon={<TrendingUp className="size-4" />} accent="blue" />
        <StatCard label="Registrations" value={formatNumber(stats.total_registrations ?? 0)} icon={<BarChart3 className="size-4" />} accent="purple" />
        <StatCard label="Verified revenue" value={formatCurrency(revenue)} hint={`${paidPayments.length} paid transactions`} icon={<Wallet className="size-4" />} accent="green" />
        <StatCard label="Completion rate" value={`${conversion}%`} hint={`${gameRows.length} published events`} icon={<BarChart3 className="size-4" />} accent="pink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title="Tournaments by title">
          {gameAgg.size ? (
            <div className="space-y-2">
              {[...gameAgg.entries()].map(([key, value]) => {
                const max = Math.max(...[...gameAgg.values()].map((row) => row.tournaments), 1);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/75">{value.name}</span>
                      <span className="text-white/40">
                        {value.tournaments} events · {formatCurrency(value.prize)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10">
                      <div className="h-full rounded bg-gradient-to-r from-rjnx-blue to-rjnx-purple" style={{ width: `${(value.tournaments / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<BarChart3 className="size-5" />} title="No data" />
          )}
        </AdminPanel>

        <AdminPanel title="Fill rate by tournament" description="Approved + pending registrations against max slots.">
          {tournamentRows.length ? (
            <ul className="space-y-2">
              {tournamentRows.slice(0, 8).map((row) => {
                const taken = row.registrations?.filter((registration) => ["approved", "pending"].includes(registration.status)).length ?? 0;
                const percent = Math.min(100, Math.round((taken / Math.max(1, row.max_slots)) * 100));
                return (
                  <li key={row.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <Link href={`/admin/tournaments/${row.id}`} className="truncate text-white/80 hover:text-rjnx-blue">
                        {row.name}
                      </Link>
                      <span className="shrink-0 text-white/40">{taken}/{row.max_slots}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/10">
                      <div className="h-full rounded bg-gradient-to-r from-rjnx-pink to-rjnx-purple" style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<BarChart3 className="size-5" />} title="No tournaments" />
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Payment transactions" description="Only verified provider transactions are counted as revenue.">
        {payments?.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Status</TH>
                <TH>Amount</TH>
                <TH>Recorded</TH>
              </TR>
            </THead>
            <TBody>
              {((payments ?? []) as { amount: number; status: string; created_at: string }[]).slice(0, 20).map((row, index) => (
                <TR key={index}>
                  <TD><Badge tone={row.status === "paid" ? "green" : row.status === "failed" ? "red" : "neutral"}>{row.status}</Badge></TD>
                  <TD className="text-white/75">{formatCurrency(Number(row.amount))}</TD>
                  <TD className="text-white/45">{formatDate(row.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <Card className="p-4">
            <p className="text-xs text-rjnx-muted">
              Payments module is disabled. Enable it in Platform settings once Razorpay credentials are configured.
            </p>
          </Card>
        )}
      </AdminPanel>
    </div>
  );
}
