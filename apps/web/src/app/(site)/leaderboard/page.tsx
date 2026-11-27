import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { getGlobalLeaderboard } from "@/server/queries";
import { initials, formatNumber } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Global leaderboard",
  description: "RJNX national leaderboard across every tournament, ranked by verified points.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LeaderboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const scope = (Array.isArray(params.scope) ? params.scope[0] : params.scope) === "teams" ? "teams" : "players";
  const rows = await getGlobalLeaderboard(50, scope);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Season 4 standings"
        title="Global leaderboard"
        description="Points aggregate every verified tournament result. Ties break on kills, then best placement."
        action={{ href: "/results", label: "Tournament results" }}
      />

      <div className="mt-5 flex gap-2">
        <Link href="/leaderboard" className={`rounded-md border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] ${scope === "players" ? "border-rjnx-blue/40 bg-rjnx-blue/10 text-white" : "border-white/10 text-white/50"}`}>
          Players
        </Link>
        <Link href="/leaderboard?scope=teams" className={`rounded-md border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] ${scope === "teams" ? "border-rjnx-blue/40 bg-rjnx-blue/10 text-white" : "border-white/10 text-white/50"}`}>
          Teams
        </Link>
      </div>

      <Card className="mt-5 p-5">
        {rows.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {rows.slice(0, 3).map((row, index) => {
                const name = scope === "teams" ? row.team?.name : row.profile?.username;
                return (
                  <div
                    key={`${row.team_id ?? row.user_id}-${index}`}
                    className={`relative overflow-hidden rounded-lg border p-4 ${
                      index === 0
                        ? "border-amber-400/40 bg-gradient-to-br from-amber-400/15 to-transparent"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    {index === 0 ? <Crown className="absolute right-3 top-3 size-4 text-amber-300" /> : null}
                    <p className="font-display text-[9px] uppercase tracking-[0.24em] text-white/40">Rank #{index + 1}</p>
                    <p className="mt-1 truncate font-display text-base font-black uppercase text-white">{name ?? "—"}</p>
                    <p className="mt-1 text-xs text-rjnx-blue">{formatNumber(row.total_points)} pts</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {row.total_kills} kills · {row.wins} wins · {row.tournaments} events
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <Table>
                <THead>
                  <TR>
                    <TH>#</TH>
                    <TH>{scope === "teams" ? "Team" : "Player"}</TH>
                    <TH>Matches</TH>
                    <TH>Kills</TH>
                    <TH>Wins</TH>
                    <TH>Points</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((row, index) => {
                    const name = scope === "teams" ? row.team?.name : row.profile?.username;
                    const href = scope === "teams" ? "/teams" : `/players/${row.profile?.username ?? ""}`;
                    return (
                      <TR key={`${row.team_id ?? row.user_id}-${index}`}>
                        <TD className="font-display text-xs text-white/50">{index + 1}</TD>
                        <TD>
                          <Link href={href} className="flex items-center gap-2 hover:text-rjnx-blue">
                            <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-white/5 font-display text-[9px] text-white/60">
                              {row.team?.logo_url || row.profile?.avatar_url ? (
                                 
                                <img src={(row.team?.logo_url ?? row.profile?.avatar_url) as string} alt="" className="size-full object-cover" />
                              ) : (
                                initials(name)
                              )}
                            </span>
                            <span className="font-semibold">{name ?? "—"}</span>
                          </Link>
                        </TD>
                        <TD className="text-white/60">{row.tournaments}</TD>
                        <TD className="text-white/60">{row.total_kills}</TD>
                        <TD className="text-white/60">{row.wins}</TD>
                        <TD className="font-display font-black text-rjnx-blue">{row.total_points}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={scope === "teams" ? <Users className="size-6" /> : <Target className="size-6" />}
            title="Leaderboard is warming up"
            description="Verified match results populate this board automatically. Register and play to claim the top spot."
          />
        )}
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
        <Badge tone="blue">Verified results only</Badge>
        <Badge tone="purple">Tie-break: kills → best placement</Badge>
        <Badge tone="neutral">Updated live</Badge>
      </div>
    </div>
  );
}
