import Link from "next/link";
import {
  ArrowUpRight, CalendarClock, Crosshair, Flame, Gamepad2, Medal, Radio, Target, TrendingUp, Trophy, Users, Wallet,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/server/auth";
import { formatCurrency, formatDate, formatNumber, relativeTime } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireUser("/dashboard");

  const [{ data: statsRaw }, { data: registrations }, { data: notifications }, { data: recentResults }, { data: upcomingMatches }] =
    await Promise.all([
      session.supabase.rpc("player_stats", { p_user_id: session.user.id }),
      session.supabase
        .from("tournament_registrations")
        .select("id, status, slot_number, created_at, tournament:tournaments(id, slug, name, starts_at, status, prize_pool, entry_fee, game:games(name, short_name))")
        .eq("user_id", session.user.id)
        .in("status", ["pending", "approved", "waitlisted"])
        .order("created_at", { ascending: false })
        .limit(6),
      session.supabase
        .from("notifications")
        .select("id, type, title, body, link, is_read, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      session.supabase
        .from("match_results")
        .select("id, placement, kills, total_points, is_verified, created_at, match:matches(id, round, match_number, tournament:tournaments(name, slug))")
        .eq("submitted_by", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      session.supabase
        .from("tournament_registrations")
        .select("tournament:tournaments(id, slug, name, starts_at, status, game:games(short_name))")
        .eq("user_id", session.user.id)
        .eq("status", "approved")
        .gte("tournament.starts_at", new Date().toISOString())
        .limit(4),
    ]);

  const stats = (statsRaw ?? {}) as {
    registered_tournaments?: number;
    tournaments_played?: number;
    completed_matches?: number;
    wins?: number;
    losses?: number;
    total_kills?: number;
    total_earnings?: number;
    global_rank?: number | null;
  };

  const profile = session.profile;
  const completion = [
    profile?.full_name,
    profile?.phone,
    profile?.country,
    profile?.in_game_name,
    profile?.game_uid,
    profile?.avatar_url,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completion / 6) * 100);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: weekly } = await session.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .gte("created_at", weekAgo);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Player command"
        title={`Welcome back, ${profile?.username ?? "player"}`}
        subtitle="Your registrations, room details, results and rank — all in one place."
        actions={
          <Link href="/tournaments">
            <Button size="sm">
              <Flame className="size-3.5" /> Find a tournament
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered tournaments" value={formatNumber(stats.registered_tournaments ?? 0)} hint={`${stats.tournaments_played ?? 0} played`} icon={<Trophy className="size-4" />} accent="blue" />
        <StatCard label="Matches completed" value={formatNumber(stats.completed_matches ?? 0)} hint={`${stats.wins ?? 0}W · ${stats.losses ?? 0}L`} icon={<Gamepad2 className="size-4" />} accent="purple" />
        <StatCard label="Total kills" value={formatNumber(stats.total_kills ?? 0)} hint={`${weekly?.length ?? 0} new alerts this week`} icon={<Crosshair className="size-4" />} accent="pink" />
        <StatCard
          label="Global rank"
          value={stats.global_rank ? `#${stats.global_rank}` : "Unranked"}
          hint={`Earnings ${formatCurrency(stats.total_earnings ?? 0)}`}
          icon={<Medal className="size-4" />}
          accent="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Trophy className="size-4 text-rjnx-blue" /> Active registrations
            </h2>
            <Link href="/dashboard/tournaments" className="font-display text-[10px] uppercase tracking-[0.18em] text-rjnx-blue hover:text-white">
              View all
            </Link>
          </div>

          {registrations?.length ? (
            <ul className="mt-4 space-y-2">
              {(registrations as unknown as {
                id: string;
                status: string;
                slot_number: number | null;
                tournament: { id: string; slug: string; name: string; starts_at: string; status: string; prize_pool: number; game: { short_name: string } | null } | null;
              }[]).map((registration) => (
                <li key={registration.id}>
                  <Link
                    href={`/tournaments/${registration.tournament?.slug}`}
                    className="group flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-rjnx-blue/30"
                  >
                    <span className="flex size-8 items-center justify-center rounded bg-gradient-to-br from-rjnx-purple/30 to-rjnx-blue/20 font-display text-[9px] font-bold text-white">
                      {registration.tournament?.game?.short_name ?? "RJNX"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white/90 group-hover:text-rjnx-blue">
                        {registration.tournament?.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                        {registration.slot_number ? `Slot #${registration.slot_number} · ` : ""}
                        {relativeTime(registration.tournament?.starts_at ?? null)}
                      </p>
                    </div>
                    <StatusBadge status={registration.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="mt-4"
              title="No active registrations"
              description="Register for a tournament to see it here, along with your slot and room credentials."
              icon={<Target className="size-5" />}
              action={
                <Link href="/tournaments">
                  <Button size="sm" variant="secondary">Browse tournaments</Button>
                </Link>
              }
            />
          )}

          {upcomingMatches?.length ? (
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-white/40">Next up</p>
              <ul className="mt-2 space-y-1.5">
                {(upcomingMatches as unknown as {
                  tournament: { id: string; slug: string; name: string; starts_at: string; game: { short_name: string } | null } | null;
                }[]).map((row) =>
                  row.tournament ? (
                    <li key={row.tournament.id} className="flex items-center justify-between gap-2 text-xs">
                      <Link href={`/dashboard/matches`} className="truncate text-white/80 hover:text-rjnx-blue">
                        {row.tournament.name}
                      </Link>
                      <span className="flex items-center gap-1 text-white/40">
                        <CalendarClock className="size-3" /> {formatDate(row.tournament.starts_at)}
                      </span>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Profile strength</h2>
            <div className="mt-3 flex items-end justify-between">
              <p className="font-display text-3xl font-black text-white">{completionPercent}%</p>
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">{completion}/6 fields</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rjnx-blue to-rjnx-pink"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-rjnx-muted">
              Complete profiles get priority in admin-approved tournaments.
            </p>
            <Link href="/dashboard/profile">
              <Button variant="secondary" size="sm" className="mt-3 w-full">
                <ArrowUpRight className="size-3.5" /> Complete profile
              </Button>
            </Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                <Radio className="size-4 text-rjnx-pink" /> Latest alerts
              </h2>
              <Link href="/dashboard/notifications" className="text-[10px] uppercase tracking-[0.16em] text-rjnx-blue hover:text-white">
                All
              </Link>
            </div>
            {notifications?.length ? (
              <ul className="mt-3 space-y-2">
                {(notifications as { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }[]).map((note) => (
                  <li key={note.id} className="flex gap-2">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${note.is_read ? "bg-white/20" : "bg-rjnx-pink"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/85">{note.title}</p>
                      <p className="truncate text-[10px] text-white/35">{note.body ?? relativeTime(note.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-rjnx-muted">No alerts yet. They arrive the moment you register.</p>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <TrendingUp className="size-4 text-emerald-400" /> Recent result submissions
          </h2>
          <Link href="/dashboard/matches" className="text-[10px] uppercase tracking-[0.16em] text-rjnx-blue hover:text-white">
            Match center
          </Link>
        </div>
        {recentResults?.length ? (
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {(recentResults as unknown as {
              id: string;
              placement: number | null;
              kills: number;
              total_points: number;
              is_verified: boolean;
              created_at: string;
              match: { id: string; round: number; match_number: number; tournament: { name: string; slug: string } | null } | null;
            }[]).map((result) => (
              <li key={result.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white/85">
                    {result.match?.tournament?.name ?? "Match"} · R{result.match?.round} #{result.match?.match_number}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                    {result.placement ? `Placed #${result.placement} · ` : ""}{result.kills} kills
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={result.is_verified ? "green" : "amber"}>{result.is_verified ? "verified" : "pending"}</Badge>
                  <span className="font-display text-xs font-black text-rjnx-blue">{result.total_points} pts</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-4"
            title="No results submitted yet"
            description="Play a match and submit your result — verified results feed your leaderboard rank."
            icon={<Users className="size-5" />}
          />
        )}
      </Card>

      <p className="flex items-center gap-2 text-[11px] text-white/30">
        <Wallet className="size-3" /> Total earnings shown are platform-recorded values, not withdrawable balance.
      </p>
    </div>
  );
}
