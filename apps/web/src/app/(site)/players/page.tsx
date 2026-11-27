import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { listPlayers } from "@/server/queries";
import { initials } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Players",
  description: "Browse the RJNX player directory and rankings.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = raw ?? "";
  const players = await listPlayers(search || undefined, 48);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Directory"
        title="Players"
        description="Search any RJNX player by username and open their public profile."
        action={{ href: "/leaderboard", label: "Rankings" }}
      />

      <Card className="mt-5 p-3">
        <form className="flex gap-2" action="/players">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <Input name="q" defaultValue={search} placeholder="Search username" className="pl-8" aria-label="Search players" />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {players.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {players.map((player) => (
            <Link key={player.id} href={`/players/${player.username}`}>
              <Card className="h-full p-4 transition-colors hover:border-rjnx-blue/35">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-[11px] font-black text-black">
                    {player.avatar_url ? (
                       
                      <img src={player.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      initials(player.username)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xs font-bold uppercase tracking-[0.08em] text-white">{player.username}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {player.in_game_name ?? player.country ?? "RJNX player"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em]">
                  <span className="text-white/40">{player.tournaments_played} events</span>
                  <span className="font-display font-bold text-rjnx-blue">{player.total_points} pts</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-5" icon={<Users className="size-6" />} title="No players found" description="Try a different username, or invite your friends to join RJNX." />
      )}
    </div>
  );
}
