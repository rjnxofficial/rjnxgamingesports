import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { requireStaff } from "@/server/auth";
import { getGames, getSlotCounts } from "@/server/queries";
import { formatCurrency, formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function AdminTournamentsPage() {
  const session = await requireStaff("/admin/tournaments");
  const games = await getGames();

  const { data } = await session.supabase
    .from("tournaments")
    .select("id, slug, name, mode, format, status, starts_at, registration_ends_at, max_slots, entry_fee, prize_pool, is_featured, game:games(name, short_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as {
    id: string;
    slug: string;
    name: string;
    mode: string;
    format: string;
    status: string;
    starts_at: string;
    registration_ends_at: string | null;
    max_slots: number;
    entry_fee: number;
    prize_pool: number;
    is_featured: boolean;
    game: { name: string; short_name: string } | null;
  }[];

  const slots = await getSlotCounts(rows.map((row) => row.id));

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Tournaments"
        subtitle={`${rows.length} events · create, edit and publish tournament brackets.`}
        actions={
          <Link href="/admin/tournaments/new">
            <Button size="sm">
              <Plus className="size-3.5" /> New tournament
            </Button>
          </Link>
        }
      />

      <AdminPanel title="All tournaments" description="Draft events are only visible to staff until published.">
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Tournament</TH>
                <TH>Game</TH>
                <TH>Format</TH>
                <TH>Slots</TH>
                <TH>Pool</TH>
                <TH>Starts</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <Link href={`/admin/tournaments/${row.id}`} className="font-semibold text-white hover:text-rjnx-blue">
                      {row.name}
                    </Link>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">/{row.slug}</p>
                  </TD>
                  <TD className="text-white/60">{row.game?.short_name ?? "—"}</TD>
                  <TD className="text-white/60">{row.mode} · {row.format.replace(/_/g, " ")}</TD>
                  <TD className="text-white/60">
                    {slots[row.id]?.taken ?? 0}/{row.max_slots}
                  </TD>
                  <TD className="text-white/70">{formatCurrency(row.prize_pool)}</TD>
                  <TD className="text-white/55">{formatDate(row.starts_at, false)}</TD>
                  <TD><StatusBadge status={row.status} /></TD>
                  <TD>
                    <div className="flex gap-2">
                      <Link href={`/admin/tournaments/${row.id}`} className="text-[10px] uppercase tracking-[0.14em] text-rjnx-blue hover:underline">
                        Manage
                      </Link>
                      <Link href={`/tournaments/${row.slug}`} className="text-[10px] uppercase tracking-[0.14em] text-white/40 hover:text-white">
                        View
                      </Link>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            icon={<Trophy className="size-6" />}
            title="No tournaments yet"
            description={`Create your first tournament for ${games.length} supported titles.`}
            action={
              <Link href="/admin/tournaments/new">
                <Button size="sm">Create tournament</Button>
              </Link>
            }
          />
        )}
      </AdminPanel>
    </div>
  );
}
