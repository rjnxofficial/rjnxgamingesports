import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, GitBranch, Swords, Trophy, Users } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { TournamentForm } from "@/components/admin/tournament-form";
import { requireStaff } from "@/server/auth";
import { getGames } from "@/server/queries";
import {
  advanceWinnerAction,
  deleteTournamentAction,
  generateBracketAction,
  reviewRegistrationAction,
  setTournamentStatusAction,
} from "@/server/actions/admin";
import { formatCurrency, formatDate, toDateTimeLocal } from "@/lib/admin-helpers";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminTournamentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await requireStaff(`/admin/tournaments/${id}`);
  const games = await getGames();

  const [{ data: tournament }, { data: rules }] = await Promise.all([
    session.supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
    session.supabase.from("scoring_rules").select("id, name, is_default").order("is_default", { ascending: false }),
  ]);
  if (!tournament) notFound();

  const [{ data: registrations }, { data: matches }] = await Promise.all([
    session.supabase
      .from("tournament_registrations")
      .select("id, status, slot_number, created_at, payment_status, team:teams(name, tag), profile:profiles(username, in_game_name, game_uid)")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    session.supabase
      .from("matches")
      .select("id, round, match_number, bracket_position, scheduled_at, status, map_name, room_published_at, room_id, next_match_id, participants:match_participants(id, slot, eliminated, team:teams(name), profile:profiles(username)), results:match_results(id, participant_id, total_points, is_verified, placement, kills)")
      .eq("tournament_id", id)
      .order("round")
      .order("match_number"),
  ]);

  const regRows = (registrations ?? []) as unknown as {
    id: string;
    status: string;
    slot_number: number | null;
    payment_status: string;
    created_at: string;
    team: { name: string; tag: string | null } | null;
    profile: { username: string; in_game_name: string | null; game_uid: string | null } | null;
  }[];

  const matchRows = (matches ?? []) as unknown as {
    id: string;
    round: number;
    match_number: number;
    bracket_position: number | null;
    scheduled_at: string | null;
    status: string;
    map_name: string | null;
    room_published_at: string | null;
    room_id: string | null;
    next_match_id: string | null;
    participants: { id: string; slot: number | null; eliminated: boolean; team: { name: string } | null; profile: { username: string } | null }[];
    results: { id: string; participant_id: string; total_points: number; is_verified: boolean; placement: number | null; kills: number }[];
  }[];

  const distribution = (tournament.prize_distribution ?? []) as { place: number; amount: number }[];
  const approvedCount = regRows.filter((row) => row.status === "approved").length;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={tournament.name}
        subtitle={`/${tournament.slug} · ${approvedCount}/${tournament.max_slots} approved registrations`}
        actions={
          <>
            <Link href={`/tournaments/${tournament.slug}`}>
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-rjnx-blue/40 hover:text-white">
                Public page <ArrowUpRight className="size-3" />
              </span>
            </Link>
            <ActionButton action={setTournamentStatusAction} fields={{ tournament_id: tournament.id, status: "registration_open" }} label="Open registration" variant="success" />
            <ActionButton action={setTournamentStatusAction} fields={{ tournament_id: tournament.id, status: "live" }} label="Go live" variant="primary" />
            <ActionButton action={setTournamentStatusAction} fields={{ tournament_id: tournament.id, status: "completed" }} label="Complete" variant="secondary" />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status" value={<StatusBadge status={tournament.status} />} />
        <Stat label="Slots" value={<span className="font-display text-lg font-black text-white">{approvedCount}/{tournament.max_slots}</span>} />
        <Stat label="Prize pool" value={<span className="font-display text-lg font-black text-white">{formatCurrency(tournament.prize_pool)}</span>} />
        <Stat label="Entry fee" value={<span className="font-display text-lg font-black text-white">{tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : "Free"}</span>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <AdminPanel
          title="Bracket & matches"
          description="Generate the bracket from approved registrations, then advance winners."
          actions={
            <ActionButton
              action={generateBracketAction}
              fields={{ tournament_id: tournament.id }}
              label={matchRows.length ? "Regenerate bracket" : "Generate bracket"}
              variant="outline"
              confirm="This deletes existing matches and results for this tournament. Continue?"
            />
          }
        >
          {matchRows.length ? (
            <div className="space-y-3">
              {Array.from(new Set(matchRows.map((match) => match.round))).map((round) => (
                <div key={round}>
                  <p className="font-display text-[9px] uppercase tracking-[0.24em] text-white/35">Round {round}</p>
                  <div className="mt-1.5 space-y-1.5">
                    {matchRows
                      .filter((match) => match.round === round)
                      .map((match) => {
                        const winner = match.results.find((result) => result.placement === 1);
                        return (
                          <div key={match.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-display text-[10px] uppercase tracking-[0.14em] text-white/45">
                                Match #{match.match_number} · {match.map_name ?? "map TBD"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={match.status} />
                                {match.room_id ? <Badge tone="purple">room set</Badge> : null}
                              </div>
                            </div>
                            <ul className="mt-1.5 space-y-1">
                              {match.participants.length ? (
                                match.participants.map((participant) => {
                                  const name = participant.team?.name ?? participant.profile?.username ?? "TBD";
                                  const score = match.results.find((result) => result.participant_id === participant.id);
                                  return (
                                    <li key={participant.id} className="flex items-center justify-between gap-2 text-xs">
                                      <span className={`truncate ${participant.eliminated ? "text-white/30 line-through" : "text-white/80"}`}>
                                        {name}
                                      </span>
                                      <span className="flex items-center gap-2">
                                        {score ? (
                                          <span className="font-display text-[11px] text-rjnx-blue">
                                            {score.total_points} pts{score.is_verified ? " ✓" : ""}
                                          </span>
                                        ) : null}
                                        {match.next_match_id && !participant.eliminated ? (
                                          <ActionButton
                                            action={advanceWinnerAction}
                                            fields={{ match_id: match.id, participant_id: participant.id }}
                                            label="Advance"
                                            size="sm"
                                            variant="ghost"
                                          />
                                        ) : null}
                                      </span>
                                    </li>
                                  );
                                })
                              ) : (
                                <li className="text-[11px] text-white/30">No participants seeded.</li>
                              )}
                            </ul>
                            {winner ? (
                              <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-amber-300">
                                <Trophy className="size-2.5" /> Winner: {winner.participant_id.slice(0, 8)}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<GitBranch className="size-6" />}
              title="No bracket yet"
              description="Approve registrations, then generate a bracket for this format."
            />
          )}
        </AdminPanel>

        <AdminPanel title="Registrations" description="Approve, reject or waitlist entries.">
          {regRows.length ? (
            <Table className="min-w-[420px]">
              <THead>
                <TR>
                  <TH>Entry</TH>
                  <TH>Payment</TH>
                  <TH>Status</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {regRows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <p className="text-xs font-semibold text-white">
                        {row.team?.name ?? row.profile?.username ?? "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                        slot {row.slot_number ?? "—"} · {row.profile?.in_game_name ?? row.profile?.game_uid ?? ""}
                      </p>
                    </TD>
                    <TD><StatusBadge status={row.payment_status} /></TD>
                    <TD><StatusBadge status={row.status} /></TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "approved" }} label="✓" variant="success" />
                        <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "rejected" }} label="✕" variant="danger" />
                        <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "waitlisted" }} label="Wait" variant="ghost" />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState icon={<Users className="size-5" />} title="No registrations" />
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Prize distribution">
        {distribution.length ? (
          <div className="flex flex-wrap gap-2">
            {distribution.map((row) => (
              <span key={row.place} className="rounded border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75">
                #{row.place} — {formatCurrency(row.amount)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-rjnx-muted">No prize split configured.</p>
        )}
        <Link href={`/admin/matches?tournament=${tournament.id}`} className="mt-3 inline-flex items-center gap-1 text-xs text-rjnx-blue hover:underline">
          <Swords className="size-3" /> Manage rooms for this event
        </Link>
      </AdminPanel>

      <AdminPanel title="Edit tournament" description="Changes apply immediately to the public page.">
        <TournamentForm
          games={games.map((game) => ({ id: game.id, name: game.name }))}
          scoringRules={(rules ?? []) as { id: string; name: string; is_default: boolean }[]}
          defaults={{
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            game_id: tournament.game_id,
            mode: tournament.mode,
            format: tournament.format,
            description: tournament.description ?? "",
            rules: tournament.rules ?? "",
            banner_url: tournament.banner_url ?? "",
            entry_fee: Number(tournament.entry_fee),
            prize_pool: Number(tournament.prize_pool),
            max_slots: tournament.max_slots,
            min_team_size: tournament.min_team_size,
            max_team_size: tournament.max_team_size,
            registration_starts_at: toDateTimeLocal(tournament.registration_starts_at),
            registration_ends_at: toDateTimeLocal(tournament.registration_ends_at),
            starts_at: toDateTimeLocal(tournament.starts_at),
            ends_at: toDateTimeLocal(tournament.ends_at),
            status: tournament.status,
            is_featured: tournament.is_featured,
            requires_approval: tournament.requires_approval,
            scoring_rule_id: tournament.scoring_rule_id ?? "",
            prize_place_1: distribution.find((row) => row.place === 1)?.amount ?? 0,
            prize_place_2: distribution.find((row) => row.place === 2)?.amount ?? 0,
            prize_place_3: distribution.find((row) => row.place === 3)?.amount ?? 0,
          }}
        />
      </AdminPanel>

      {session.isSuperAdmin ? (
        <Card className="border-rjnx-red/25 p-5">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-rjnx-red">Danger zone</h2>
          <p className="mt-1 text-xs text-white/45">Deleting a tournament cascades to registrations, matches and results.</p>
          <div className="mt-3">
            <ActionButton
              action={deleteTournamentAction}
              fields={{ tournament_id: tournament.id }}
              label="Delete tournament"
              variant="danger"
              size="sm"
              confirm="Permanently delete this tournament and all related data?"
            />
          </div>
        </Card>
      ) : null}

      <p className="text-[10px] uppercase tracking-[0.18em] text-white/25">
        Created {formatDate(tournament.created_at)} · last updated {formatDate(tournament.updated_at)}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <div className="mt-1">{value}</div>
    </Card>
  );
}
