import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock, CheckCircle2, Crown, Gamepad2, Hash, Radio, ShieldCheck, Swords, Trophy, Users, Wallet,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RegisterPanel } from "@/components/tournaments/register-panel";
import { getTournamentBySlug } from "@/server/queries";
import { getSessionContext } from "@/server/auth";
import { paymentsConfigured } from "@/lib/payments/razorpay";
import { FORMAT_LABELS, formatCurrency, formatDate, relativeTime, type TournamentFormat } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);
  if (!data?.tournament) return { title: "Tournament not found" };
  return {
    title: data.tournament.name,
    description: data.tournament.description?.slice(0, 155) ?? `${data.tournament.name} on RJNX GAMING ESPORTS.`,
    openGraph: {
      title: data.tournament.name,
      description: data.tournament.description?.slice(0, 155) ?? undefined,
      images: data.tournament.banner_url ? [data.tournament.banner_url] : undefined,
    },
  };
}

export default async function TournamentDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);
  const tournament = data.tournament;
  if (!tournament) notFound();

  const { slots, participants, matches, leaderboard } = data;
  const session = await getSessionContext();

  type ExistingRegistration = {
    id: string;
    status: string;
    slot_number: number | null;
    team_id: string | null;
    payment_status?: string;
  };
  let existingRegistration: ExistingRegistration | null = null;
  let teams: { id: string; name: string; member_count: number }[] = [];

  if (session) {
    const [{ data: registration }, { data: memberships }] = await Promise.all([
      session.supabase
        .from("tournament_registrations")
        .select("id, status, slot_number, team_id, payment_status")
        .eq("tournament_id", tournament.id)
        .eq("user_id", session.user.id)
        .in("status", ["pending", "approved", "waitlisted"])
        .maybeSingle(),
      session.supabase
        .from("team_members")
        .select("team:teams(id, name, team_members(user_id))")
        .eq("user_id", session.user.id),
    ]);

    existingRegistration = (registration as ExistingRegistration | null) ?? null;

    const captainTeams = await session.supabase
      .from("teams")
      .select("id, name, team_members(user_id)")
      .eq("captain_id", session.user.id);

    const map = new Map<string, { id: string; name: string; member_count: number }>();
    for (const row of (captainTeams.data ?? []) as { id: string; name: string; team_members: { user_id: string }[] }[]) {
      map.set(row.id, { id: row.id, name: row.name, member_count: row.team_members?.length ?? 0 });
    }
    for (const row of (memberships ?? []) as unknown as { team: { id: string; name: string; team_members: { user_id: string }[] } | null }[]) {
      if (row.team) map.set(row.team.id, { id: row.team.id, name: row.team.name, member_count: row.team.team_members?.length ?? 0 });
    }
    teams = [...map.values()];
  }

  const approvedCount = slots.approved;
  const distribution = (tournament.prize_distribution ?? [])
    .slice()
    .sort((a, b) => a.place - b.place);

  return (
    <div>
      {/* ------------------------------------------------------------ banner */}
      <div className="relative border-b border-white/[0.06]">
        <div className="absolute inset-0 overflow-hidden">
          {tournament.banner_url ? (
             
            <img src={tournament.banner_url} alt="" className="size-full object-cover opacity-30" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-rjnx-bg via-rjnx-bg/80 to-rjnx-bg/40" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6">
          <nav className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40" aria-label="Breadcrumb">
            <Link href="/tournaments" className="hover:text-rjnx-blue">Tournaments</Link>
            <span>/</span>
            <span className="text-white/70">{tournament.game?.name ?? "Event"}</span>
          </nav>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tournament.status} />
                <Badge tone="blue">{tournament.mode}</Badge>
                <Badge tone="purple">{FORMAT_LABELS[tournament.format as TournamentFormat] ?? tournament.format}</Badge>
                {tournament.is_featured ? <Badge tone="pink">Featured</Badge> : null}
                {tournament.requires_approval ? <Badge tone="amber">Approval required</Badge> : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-black uppercase leading-tight tracking-[0.02em] text-white sm:text-4xl">
                {tournament.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60">
                {tournament.description ?? "Competitive RJNX tournament. Read the rules before registering."}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Meta icon={<Trophy className="size-3.5" />} label="Prize pool" value={formatCurrency(tournament.prize_pool)} />
                <Meta icon={<Wallet className="size-3.5" />} label="Entry fee" value={tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : "Free"} />
                <Meta icon={<CalendarClock className="size-3.5" />} label="Starts" value={formatDate(tournament.starts_at)} />
                <Meta icon={<Users className="size-3.5" />} label="Slots" value={`${slots.taken}/${tournament.max_slots}`} />
              </div>
            </div>

            <Card glow className="h-fit p-5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-rjnx-blue">Registration</p>
              <div className="mt-3 space-y-2 text-xs text-white/60">
                <Row label="Opens" value={formatDate(tournament.registration_starts_at)} />
                <Row label="Closes" value={tournament.registration_ends_at ? relativeTime(tournament.registration_ends_at) : "—"} />
                <Row label="Team size" value={`${tournament.min_team_size}–${tournament.max_team_size} players`} />
                <Row label="Approved" value={`${approvedCount} teams/players`} />
              </div>
              <div className="mt-4 border-t border-white/[0.07] pt-4">
                <RegisterPanel
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                  mode={tournament.mode}
                  minTeamSize={tournament.min_team_size}
                  maxTeamSize={tournament.max_team_size}
                  status={tournament.status}
                  entryFee={tournament.entry_fee}
                  slots={slots}
                  maxSlots={tournament.max_slots}
                  registrationEndsAt={tournament.registration_ends_at}
                  requiresApproval={tournament.requires_approval}
                  isAuthenticated={Boolean(session)}
                  existingRegistration={existingRegistration}
                  paymentDue={
                    existingRegistration && existingRegistration.payment_status !== "paid" ? tournament.entry_fee : 0
                  }
                  paymentsEnabled={paymentsConfigured()}
                  player={{
                    name: session?.profile?.full_name ?? session?.profile?.username ?? "",
                    email: session?.user.email ?? "",
                  }}
                  teams={teams}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- body */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <ShieldCheck className="size-4 text-rjnx-blue" /> Rules & regulations
            </h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {tournament.rules ?? "Standard RJNX rules apply. Room credentials are shared only with approved participants 15 minutes before start. Cheating, teaming or emulator use results in a permanent ban."}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Trophy className="size-4 text-rjnx-pink" /> Prize distribution
            </h2>
            {distribution.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {distribution.map((row) => (
                  <div key={row.place} className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {row.place === 1 ? <Crown className="size-3 text-amber-300" /> : <Hash className="size-3" />}
                      {row.label ?? `Place ${row.place}`}
                    </p>
                    <p className="mt-1 font-display text-lg font-black text-white">{formatCurrency(row.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-rjnx-muted">Prize split announced before the first match.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                <Swords className="size-4 text-rjnx-purple" /> Match schedule
              </h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">{matches.length} matches</span>
            </div>
            {matches.length ? (
              <div className="mt-3">
                <Table>
                  <THead>
                    <TR>
                      <TH>Round</TH>
                      <TH>Match</TH>
                      <TH>Scheduled</TH>
                      <TH>Map</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {matches.map((match) => (
                      <TR key={match.id}>
                        <TD>R{match.round}{match.group_label ? ` · ${match.group_label}` : ""}</TD>
                        <TD>#{match.match_number}</TD>
                        <TD className="text-white/60">{formatDate(match.scheduled_at)}</TD>
                        <TD className="text-white/60">{match.map_name ?? "TBD"}</TD>
                        <TD><StatusBadge status={match.status} /></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-rjnx-muted">The bracket is published once registration closes.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                <Users className="size-4 text-rjnx-blue" /> Participants
              </h2>
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                {participants.length} registered
              </span>
            </div>
            {participants.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {participants.map((participant, index) => {
                  const name = participant.team?.name ?? participant.profile?.username ?? "Player";
                  const sub = participant.team
                    ? participant.team.tag ?? "Team"
                    : participant.profile?.in_game_name ?? "Solo";
                  return (
                    <li
                      key={participant.id}
                      className="flex items-center gap-2.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <span className="flex size-6 items-center justify-center rounded bg-white/5 font-display text-[10px] text-white/50">
                        {participant.slot_number ?? index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white/90">{name}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{sub}</p>
                      </div>
                      {participant.status === "approved" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                      ) : (
                        <Badge tone="amber">{participant.status}</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-rjnx-muted">No registrations yet — be the first in the lobby.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Trophy className="size-4 text-rjnx-blue" /> Tournament leaderboard
            </h2>
            {leaderboard.length ? (
              <ol className="mt-3 space-y-1.5">
                {leaderboard.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 font-display text-[11px] text-white/40">{entry.rank}</span>
                    <span className="min-w-0 flex-1 truncate text-white/85">
                      {entry.team?.name ?? entry.profile?.username ?? "—"}
                    </span>
                    <span className="font-display text-xs font-bold text-rjnx-blue">{entry.total_points}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-rjnx-muted">Points appear after results are verified.</p>
            )}
            <Link href="/leaderboard" className="mt-4 inline-block text-xs text-rjnx-blue hover:underline">
              Global leaderboard →
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Event facts</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <Row label="Game" value={tournament.game?.name ?? "—"} />
              <Row label="Format" value={FORMAT_LABELS[tournament.format as TournamentFormat] ?? tournament.format} />
              <Row label="Mode" value={tournament.mode.toUpperCase()} />
              <Row label="Registration closes" value={formatDate(tournament.registration_ends_at)} />
              <Row label="Event ends" value={formatDate(tournament.ends_at)} />
              {tournament.scoring_rules ? <Row label="Scoring" value={tournament.scoring_rules.name} /> : null}
            </dl>
            {tournament.scoring_rules ? (
              <div className="mt-4 rounded-md border border-white/[0.07] bg-black/30 p-3">
                <p className="font-display text-[9px] uppercase tracking-[0.2em] text-white/40">Points per kill</p>
                <p className="font-display text-sm font-black text-white">{tournament.scoring_rules.kill_points}</p>
                <p className="mt-2 font-display text-[9px] uppercase tracking-[0.2em] text-white/40">Placement points</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tournament.scoring_rules.placement_points?.slice(0, 8).map((row) => (
                    <span key={row.placement} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
                      #{row.placement} · {row.points}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Gamepad2 className="size-4 text-rjnx-purple" />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">Get room alerts</p>
            </div>
            <p className="mt-2 text-sm text-white/60">
              Install the RJNX Android app for instant push notifications when your room is published.
            </p>
            <Link href="/support" className="mt-3 inline-flex items-center gap-1 text-xs text-rjnx-blue hover:underline">
              <Radio className="size-3" /> Download the app
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2">
      <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-white/40">
        <span className="text-rjnx-blue">{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 font-display text-xs font-bold text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-right font-semibold text-white/85">{value}</dd>
    </div>
  );
}
