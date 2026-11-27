import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarClock, ChevronRight, Flame, Gamepad2, Radio, ShieldCheck, Sparkles, Swords, Target, Trophy, Users, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { getHomeData } from "@/server/queries";
import { BRAND, formatCurrency, formatDate, formatNumber, relativeTime } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Join RJNX GAMING ESPORTS tournaments for Free Fire, BGMI, Valorant and more. Real brackets, verified results, national leaderboards.",
};

export default async function HomePage() {
  const data = await getHomeData();
  const stats = data.stats;

  return (
    <div className="overflow-x-clip">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rjnx-blue/30 bg-rjnx-blue/[0.07] px-3 py-1">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rjnx-pink opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-rjnx-pink" />
              </span>
              <span className="font-display text-[9px] font-bold uppercase tracking-[0.28em] text-white/70">
                Season 4 · {stats?.live_tournaments ?? 0} live now
              </span>
            </div>

            <h1 className="mt-5 font-display text-4xl font-black uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-5xl lg:text-6xl">
              Be <span className="text-gradient">savage</span>.
              <br />
              Not <span className="neon-text text-rjnx-blue">average</span>.
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/60 sm:text-lg">
              India&apos;s competitive esports arena. Weekly tournaments across eight titles, verified
              results, real prize pools and a national leaderboard that respects your grind.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/tournaments">
                <Button size="lg" shape="hud">
                  <Swords className="size-4" /> Join a tournament
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="lg" variant="secondary" shape="hud">
                  <Trophy className="size-4" /> View leaderboard
                </Button>
              </Link>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
              <HeroStat label="Prize distributed" value={formatCurrency(stats?.total_prize_pool ?? 0)} icon={<Trophy className="size-3.5" />} />
              <HeroStat label="Registered players" value={formatNumber(stats?.total_players ?? 0)} icon={<Users className="size-3.5" />} />
              <HeroStat label="Tournaments" value={formatNumber(stats?.total_tournaments ?? 0)} icon={<Swords className="size-3.5" />} />
            </dl>
          </div>

          <div className="relative">
            <div className="glass hud-corners relative overflow-hidden rounded-2xl p-1">
              <div className="relative overflow-hidden rounded-xl">
                { }
                <img
                  src={data.banners.find((b) => b.placement === "home_hero")?.image_url ?? "/brand/hero-arena.svg"}
                  alt="RJNX arena"
                  className="h-64 w-full object-cover sm:h-80 lg:h-[26rem]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rjnx-bg via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-[9px] font-bold uppercase tracking-[0.3em] text-rjnx-blue">
                      Now entering
                    </p>
                    <p className="font-display text-lg font-black uppercase text-white">The arena</p>
                  </div>
                  <Link href="/tournaments?status=live">
                    <Button size="sm" variant="outline" shape="pill">
                      <Radio className="size-3" /> Watch live
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-rjnx-purple/20 via-transparent to-rjnx-blue/20 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ live strip */}
      {data.live.length ? (
        <section className="border-y border-white/[0.06] bg-black/30">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.24em] text-rjnx-red">
                <Radio className="size-3.5 animate-pulse" /> Live
              </span>
              <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
                {data.live.map((tournament) => (
                  <Link
                    key={tournament.id}
                    href={`/tournaments/${tournament.slug}`}
                    className="flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-rjnx-red/40 hover:text-white"
                  >
                    <span className="size-1.5 rounded-full bg-rjnx-red" />
                    {tournament.name}
                    <ChevronRight className="size-3 text-white/30" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- featured */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Flagship events"
          title="Featured tournaments"
          description="The headline events of Season 4 — bigger pools, bigger pressure."
          action={{ href: "/tournaments", label: "All tournaments" }}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.featured.length ? (
            data.featured.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} priority={index < 3} />
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                title="No featured tournaments yet"
                description="Staff can mark tournaments as featured from the admin command center."
                icon={<Sparkles className="size-6" />}
                action={
                  <Link href="/tournaments">
                    <Button variant="secondary" size="sm">Browse all events</Button>
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- games */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeading eyebrow="Titles" title="Compete in your game" action={{ href: "/tournaments", label: "Filter by game" }} />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["free-fire", "bgmi", "valorant", "call-of-duty-mobile"].map((slug, index) => {
            const labels: Record<string, { name: string; short: string }> = {
              "free-fire": { name: "Free Fire", short: "FF" },
              bgmi: { name: "BGMI", short: "BGMI" },
              valorant: { name: "Valorant", short: "VAL" },
              "call-of-duty-mobile": { name: "COD Mobile", short: "CODM" },
            };
            const game = labels[slug];
            return (
              <Link key={slug} href={`/tournaments?game=${slug}`}>
                <Card
                  className={`group flex h-24 flex-col justify-between overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-rjnx-blue/40 ${
                    index === 0 ? "bg-gradient-to-br from-rjnx-purple/20 to-transparent" : ""
                  }`}
                >
                  <Gamepad2 className="size-5 text-rjnx-blue/80" />
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-white group-hover:text-rjnx-blue">
                      {game?.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{game?.short} circuit</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------ upcoming */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeading
          eyebrow="Open registration"
          title="Upcoming tournaments"
          description="Secure your slot before the lobby fills."
          action={{ href: "/tournaments?status=upcoming", label: "See schedule" }}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.upcoming.length ? (
            data.upcoming.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)
          ) : (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                title="No open registrations"
                description="New events drop every week. Follow us on Instagram so you don't miss the next lobby."
                icon={<CalendarClock className="size-6" />}
              />
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------- leaderboard + news */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-rjnx-pink">Hall of fame</p>
              <h2 className="mt-1 font-display text-lg font-black uppercase text-white">Top players</h2>
            </div>
            <Link href="/leaderboard" className="font-display text-[10px] uppercase tracking-[0.18em] text-rjnx-blue hover:text-white">
              Full board
            </Link>
          </div>

          <ol className="mt-4 space-y-2">
            {data.leaderboard.length ? (
              data.leaderboard.map((entry, index) => {
                const name = entry.profile?.username ?? entry.team?.name ?? "Unknown";
                return (
                  <li key={`${entry.team_id ?? entry.user_id}-${index}`}>
                    <div className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span
                        className={`flex size-7 items-center justify-center rounded font-display text-[11px] font-black ${
                          index === 0
                            ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black"
                            : index === 1
                              ? "bg-white/20 text-white"
                              : index === 2
                                ? "bg-amber-700/60 text-white"
                                : "bg-white/5 text-white/50"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-xs font-bold uppercase tracking-[0.08em] text-white">{name}</p>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                          {entry.total_kills} kills · {entry.wins} wins
                        </p>
                      </div>
                      <span className="font-display text-sm font-black text-rjnx-blue">{entry.total_points}</span>
                    </div>
                  </li>
                );
              })
            ) : (
              <li>
                <EmptyState title="Leaderboard warming up" description="Points appear as soon as verified results are published." icon={<Target className="size-5" />} />
              </li>
            )}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Latest announcements</h2>
              <Link href="/news" className="font-display text-[10px] uppercase tracking-[0.18em] text-rjnx-blue hover:text-white">
                All news
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {data.news.length ? (
                data.news.map((article) => (
                  <li key={article.id}>
                    <Link href={`/news/${article.slug}`} className="group flex gap-3">
                      <div className="size-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-rjnx-surface">
                        {article.cover_url ? (
                           
                          <img src={article.cover_url} alt="" className="size-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-white/90 group-hover:text-rjnx-blue">
                          {article.title}
                        </p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/35">
                          {relativeTime(article.published_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-rjnx-muted">No announcements published yet.</li>
              )}
            </ul>
          </Card>

          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-rjnx-pink/20 blur-2xl" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-rjnx-pink" />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">Fair play first</p>
            </div>
            <p className="mt-2 text-sm text-white/60">
              Every listed result is reviewed by a tournament manager before points hit the board.
              Room credentials are released only to approved participants.
            </p>
            <Link href="/faq#fair-play" className="mt-3 inline-flex items-center gap-1 text-xs text-rjnx-blue hover:underline">
              Read the policy <ArrowRight className="size-3" />
            </Link>
          </Card>
        </div>
      </section>

      {/* --------------------------------------------------------- winners */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeading
          eyebrow="Recent champions"
          title="Winners & past finals"
          action={{ href: "/results", label: "All results" }}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.winners.length ? (
            data.winners.map((winner) => (
              <Link key={winner.id} href={`/tournaments/${winner.slug}`}>
                <Card className="group h-full overflow-hidden p-0 transition-all hover:-translate-y-1 hover:border-rjnx-pink/40">
                  <div className="relative h-28 overflow-hidden border-b border-white/[0.06]">
                    {winner.banner_url ? (
                       
                      <img src={winner.banner_url} alt="" className="size-full object-cover opacity-70" loading="lazy" />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-rjnx-surface to-transparent" />
                    <Trophy className="absolute bottom-2 right-2 size-4 text-amber-300" />
                  </div>
                  <div className="p-4">
                    <p className="font-display text-[9px] uppercase tracking-[0.2em] text-white/40">
                      {winner.game?.short_name ?? "RJNX"} · {formatDate(winner.starts_at, false)}
                    </p>
                    <p className="mt-1 line-clamp-2 font-display text-xs font-bold uppercase text-white group-hover:text-rjnx-pink">
                      {winner.name}
                    </p>
                    <p className="mt-1 text-[11px] text-rjnx-muted">Pool {formatCurrency(winner.prize_pool)}</p>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-4">
              <EmptyState title="Season archive empty" description="Completed tournaments will be archived here." icon={<Trophy className="size-6" />} />
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-rjnx-blue/25 bg-gradient-to-br from-rjnx-purple/20 via-rjnx-surface to-rjnx-blue/10 p-8 text-center sm:p-12">
          <div className="scanline pointer-events-none absolute inset-0 opacity-30" />
          <Flame className="mx-auto size-8 text-rjnx-pink" />
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-[0.06em] text-white sm:text-3xl">
            Ready to be savage?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
            Create your player profile, build your squad, and register for the next lobby in under two minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg" shape="hud">
                <Zap className="size-4" /> Create free account
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="lg" variant="outline" shape="hud">
                Browse events
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
            <Badge tone="blue">Free to join</Badge>
            <Badge tone="purple">Verified results</Badge>
            <Badge tone="pink">Android app</Badge>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/40">
        <span className="text-rjnx-blue">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 font-display text-sm font-black text-white">{value}</dd>
    </div>
  );
}
