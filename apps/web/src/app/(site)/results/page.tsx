import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Medal, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { listResults } from "@/server/queries";
import { formatCurrency, formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Results",
  description: "Verified RJNX tournament results, final standings and champions.",
};

export default async function ResultsPage() {
  const results = await listResults();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Archive"
        title="Results & champions"
        description="Every completed tournament with its verified final standings."
        action={{ href: "/leaderboard", label: "Global leaderboard" }}
      />

      <div className="mt-6 space-y-4">
        {results.length ? (
          results.map((event) => {
            const standings = [...event.leaderboard_entries].filter((row) => row.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
            const champion = standings[0];
            return (
              <Card key={event.id} className="overflow-hidden p-0">
                <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
                  <div className="relative h-32 overflow-hidden rounded-md border border-white/[0.07] bg-rjnx-surface md:h-full">
                    {event.banner_url ? (
                       
                      <img src={event.banner_url} alt="" className="size-full object-cover opacity-70" loading="lazy" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute inset-x-3 bottom-2">
                      <Badge tone="neutral">{event.game?.short_name ?? "RJNX"}</Badge>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/60">{formatDate(event.starts_at, false)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/tournaments/${event.slug}`} className="font-display text-base font-black uppercase tracking-[0.04em] text-white hover:text-rjnx-blue">
                          {event.name}
                        </Link>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
                          {event.mode} · pool {formatCurrency(event.prize_pool)}
                        </p>
                      </div>
                      {champion ? (
                        <div className="rounded-md border border-amber-400/30 bg-amber-400/[0.07] px-3 py-1.5">
                          <p className="flex items-center gap-1.5 font-display text-[9px] uppercase tracking-[0.2em] text-amber-300">
                            <Crown className="size-3" /> Champion
                          </p>
                          <p className="font-display text-sm font-black text-white">
                            {champion.team?.name ?? champion.profile?.username ?? "TBD"}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {standings.length ? (
                      <ol className="mt-3 grid gap-1.5 sm:grid-cols-3">
                        {standings.slice(0, 3).map((row) => (
                          <li key={`${row.rank}-${row.team?.name ?? row.profile?.username}`} className="flex items-center gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                            <Medal className={`size-3.5 ${row.rank === 1 ? "text-amber-300" : row.rank === 2 ? "text-white/60" : "text-amber-700"}`} />
                            <span className="min-w-0 flex-1 truncate text-xs text-white/85">
                              {row.team?.name ?? row.profile?.username ?? "—"}
                            </span>
                            <span className="font-display text-[11px] font-bold text-rjnx-blue">{row.total_points}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-xs text-rjnx-muted">Standings pending verification.</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={<Trophy className="size-6" />}
            title="No completed tournaments yet"
            description="Results are archived here as soon as a tournament finishes and results are verified."
          />
        )}
      </div>
    </div>
  );
}
