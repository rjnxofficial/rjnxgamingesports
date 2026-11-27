import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, MapPin, Swords, Target, Trophy, Users } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getPlayerByUsername } from "@/server/queries";
import { formatDate, initials } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} — player profile`,
    description: `Tournament history, stats and achievements for ${username} on RJNX GAMING ESPORTS.`,
  };
}

export default async function PlayerProfilePage({ params }: { params: Params }) {
  const { username } = await params;
  const data = await getPlayerByUsername(username);
  if (!data) notFound();

  const { profile, teams, history, achievements } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-rjnx-purple/20 blur-3xl" />
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-2xl font-black text-black">
            {profile.avatar_url ? (
               
              <img src={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              initials(profile.username)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black uppercase tracking-[0.05em] text-white">{profile.username}</h1>
              {profile.rank ? <Badge tone="blue">Global #{profile.rank}</Badge> : <Badge tone="neutral">Unranked</Badge>}
            </div>
            <p className="mt-1 text-sm text-white/55">
              {profile.full_name ?? "RJNX player"}
              {profile.in_game_name ? ` · IGN ${profile.in_game_name}` : ""}
            </p>
            {profile.country || profile.state ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-white/35">
                <MapPin className="size-3" /> {[profile.state, profile.country].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Points" value={String(profile.total_points)} accent />
            <Stat label="Kills" value={String(profile.total_kills)} />
            <Stat label="Wins" value={String(profile.wins)} />
            <Stat label="Events" value={String(profile.tournaments_played)} />
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <Swords className="size-4 text-rjnx-blue" /> Tournament history
          </h2>
          {history.length ? (
            <div className="mt-3">
              <Table>
                <THead>
                  <TR>
                    <TH>Tournament</TH>
                    <TH>Date</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {history.map((row, index) => (
                    <TR key={index}>
                      <TD>
                        <Link href={`/tournaments/${row.tournament?.slug}`} className="hover:text-rjnx-blue">
                          {row.tournament?.name ?? "—"}
                        </Link>
                        <span className="ml-1 text-[10px] uppercase text-white/30">{row.tournament?.game?.short_name}</span>
                      </TD>
                      <TD className="text-white/55">{formatDate(row.tournament?.starts_at, false)}</TD>
                      <TD><StatusBadge status={row.status} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-rjnx-muted">No public tournament history yet.</p>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Users className="size-4 text-rjnx-purple" /> Squads
            </h2>
            {teams.length ? (
              <ul className="mt-2 space-y-1.5">
                {teams.map((row, index) => (
                  <li key={index} className="flex items-center justify-between text-xs">
                    <span className="text-white/80">{row.team?.name}</span>
                    <Badge tone={row.role === "captain" ? "amber" : "neutral"}>{row.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-rjnx-muted">Not currently on a team.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Award className="size-4 text-amber-300" /> Achievements
            </h2>
            {achievements.length ? (
              <ul className="mt-2 space-y-1.5">
                {achievements.map((row, index) => (
                  <li key={index} className="flex items-center gap-2 text-xs">
                    <Trophy className="size-3 text-amber-300" />
                    <span className="min-w-0 flex-1 truncate text-white/80">{row.tournament?.name}</span>
                    <span className="font-display text-[11px] text-amber-300">#{row.rank}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-rjnx-muted">No podium finishes yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 text-xs text-white/45">
              <Target className="size-3.5 text-rjnx-blue" /> Stats update automatically from verified results.
            </p>
            <Link href="/leaderboard">
              <Button variant="secondary" size="sm" className="mt-3 w-full">See full leaderboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-center">
      <p className="text-[8px] uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className={`font-display text-sm font-black ${accent ? "text-rjnx-blue" : "text-white"}`}>{value}</p>
    </div>
  );
}
