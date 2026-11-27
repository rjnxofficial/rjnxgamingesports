import type { Metadata } from "next";
import Link from "next/link";
import { Search, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { getGames, listTeams } from "@/server/queries";
import { initials } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Teams",
  description: "Browse RJNX squads, rosters and team rankings.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const search = first(params.q);
  const game = first(params.game) || "all";

  const [games, teams] = await Promise.all([getGames(), listTeams({ search, game })]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Squads"
        title="Teams"
        description="Every active RJNX squad, ranked by verified tournament points."
        action={{ href: "/dashboard/teams", label: "Create your team" }}
      />

      <Card className="mt-5 p-3">
        <form className="grid gap-2 sm:grid-cols-[1fr_220px_auto]" action="/teams">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <Input name="q" defaultValue={search} placeholder="Search teams" className="pl-8" aria-label="Search teams" />
          </div>
          <Select name="game" defaultValue={game} aria-label="Filter by game">
            <option value="all">All games</option>
            {games.map((item) => (
              <option key={item.id} value={item.slug}>{item.name}</option>
            ))}
          </Select>
          <Button type="submit">Filter</Button>
        </form>
      </Card>

      {teams.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="p-4 transition-colors hover:border-rjnx-blue/35">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-rjnx-purple/30 to-rjnx-blue/20 font-display text-xs font-black text-white">
                  {team.logo_url ? (
                     
                    <img src={team.logo_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    initials(team.name)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold uppercase tracking-[0.06em] text-white">{team.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                    {team.game?.short_name ?? "Open"} · {team.tag ?? "—"}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded bg-white/[0.03] py-1.5">
                  <dt className="text-[8px] uppercase tracking-[0.16em] text-white/35">Members</dt>
                  <dd className="font-display text-xs font-bold text-white">{team.member_count}</dd>
                </div>
                <div className="rounded bg-white/[0.03] py-1.5">
                  <dt className="text-[8px] uppercase tracking-[0.16em] text-white/35">Points</dt>
                  <dd className="font-display text-xs font-bold text-rjnx-blue">{team.total_points}</dd>
                </div>
                <div className="rounded bg-white/[0.03] py-1.5">
                  <dt className="text-[8px] uppercase tracking-[0.16em] text-white/35">Wins</dt>
                  <dd className="font-display text-xs font-bold text-white">{team.wins}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="neutral">{team.tournaments_played} events</Badge>
                <Link href="/dashboard/teams" className="text-[10px] uppercase tracking-[0.16em] text-rjnx-blue hover:text-white">
                  Team tools →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          icon={<Users className="size-6" />}
          title="No teams found"
          description="Create the first squad and start registering for team-format tournaments."
          action={
            <Link href="/dashboard/teams">
              <Button size="sm">Create a team</Button>
            </Link>
          }
        />
      )}

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="flex items-center gap-2 text-xs text-white/50">
          <Shield className="size-3.5 text-rjnx-blue" /> Team rosters are verified against tournament format rules at registration.
        </p>
        <Link href="/dashboard/teams">
          <Button variant="secondary" size="sm">Manage my team</Button>
        </Link>
      </Card>
    </div>
  );
}
