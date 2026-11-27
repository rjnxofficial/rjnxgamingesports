import Link from "next/link";
import { CalendarClock, Trophy } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/server/auth";
import { formatCurrency, formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function MyTournamentsPage() {
  const session = await requireUser("/dashboard/tournaments");

  const { data } = await session.supabase
    .from("tournament_registrations")
    .select(
      "id, status, slot_number, created_at, payment_status, team:teams(name, tag), tournament:tournaments(id, slug, name, starts_at, status, prize_pool, entry_fee, mode, game:games(name, short_name))",
    )
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    status: string;
    slot_number: number | null;
    created_at: string;
    payment_status: string;
    team: { name: string; tag: string | null } | null;
    tournament: {
      id: string;
      slug: string;
      name: string;
      starts_at: string;
      status: string;
      prize_pool: number;
      entry_fee: number;
      mode: string;
      game: { name: string; short_name: string } | null;
    } | null;
  }[];

  const active = rows.filter((row) => ["pending", "approved", "waitlisted"].includes(row.status));
  const past = rows.filter((row) => !["pending", "approved", "waitlisted"].includes(row.status));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My tournaments"
        title="Registration history"
        subtitle="Every event you've entered, with slot numbers and approval status."
        actions={
          <Link href="/tournaments">
            <Button size="sm" variant="secondary">Browse tournaments</Button>
          </Link>
        }
      />

      <Card className="p-5">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Active entries</h2>
        {active.length ? (
          <div className="mt-3">
            <Table>
              <THead>
                <TR>
                  <TH>Tournament</TH>
                  <TH>Team</TH>
                  <TH>Slot</TH>
                  <TH>Starts</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {active.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <p className="font-semibold text-white">{row.tournament?.name ?? "—"}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                        {row.tournament?.game?.short_name} · {row.tournament?.mode}
                      </p>
                    </TD>
                    <TD className="text-white/70">{row.team?.name ?? "Solo"}</TD>
                    <TD className="text-white/70">{row.slot_number ?? "—"}</TD>
                    <TD className="text-white/60">{formatDate(row.tournament?.starts_at)}</TD>
                    <TD><StatusBadge status={row.payment_status} /></TD>
                    <TD><StatusBadge status={row.status} /></TD>
                    <TD>
                      <Link href={`/tournaments/${row.tournament?.slug}`} className="text-xs text-rjnx-blue hover:underline">
                        Open
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            title="No active entries"
            description="Register for a tournament and it appears here instantly."
            icon={<Trophy className="size-5" />}
            action={
              <Link href="/tournaments">
                <Button size="sm">Find a tournament</Button>
              </Link>
            }
          />
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Archive</h2>
        {past.length ? (
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {past.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-white/85">{row.tournament?.name ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                    {formatDate(row.created_at, false)} · pool {formatCurrency(row.tournament?.prize_pool ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{row.status}</Badge>
                  <Link href={`/tournaments/${row.tournament?.slug}`} className="text-xs text-rjnx-blue hover:underline">
                    Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-rjnx-muted">
            <CalendarClock className="size-4" /> Completed and cancelled entries will be archived here.
          </p>
        )}
      </Card>
    </div>
  );
}
