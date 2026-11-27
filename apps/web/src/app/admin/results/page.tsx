import Link from "next/link";
import { ClipboardCheck, Trophy } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { ResultEntryForm } from "./result-forms";
import { requireStaff } from "@/server/auth";
import { recalculateLeaderboardAction, verifyResultsAction } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tournamentFilter = (Array.isArray(params.tournament) ? params.tournament[0] : params.tournament) ?? "";
  const session = await requireStaff("/admin/results");

  const { data: tournaments } = await session.supabase
    .from("tournaments")
    .select("id, name, status, format")
    .in("status", ["live", "registration_closed", "registration_open", "completed"])
    .order("starts_at", { ascending: false })
    .limit(60);

  let matchQuery = session.supabase
    .from("matches")
    .select("id, round, match_number, status, tournament_id, tournament:tournaments(id, name, slug, status), participants:match_participants(id, team:teams(name), profile:profiles(username), results:match_results(id, placement, kills, total_points, is_verified))")
    .order("round")
    .order("match_number")
    .limit(40);
  if (tournamentFilter) matchQuery = matchQuery.eq("tournament_id", tournamentFilter);

  const { data: matches } = await matchQuery;

  const rows = (matches ?? []) as unknown as {
    id: string;
    round: number;
    match_number: number;
    status: string;
    tournament_id: string;
    tournament: { id: string; name: string; slug: string; status: string } | null;
    participants: {
      id: string;
      team: { name: string } | null;
      profile: { username: string } | null;
      results: { id: string; placement: number | null; kills: number; total_points: number; is_verified: boolean }[];
    }[];
  }[];

  const pending = rows.flatMap((match) =>
    match.participants.flatMap((participant) =>
      participant.results
        .filter((result) => !result.is_verified)
        .map((result) => ({
          ...result,
          name: participant.team?.name ?? participant.profile?.username ?? "Participant",
          matchLabel: `${match.tournament?.name} · R${match.round} #${match.match_number}`,
        })),
    ),
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Result verification"
        subtitle="Enter results with the tournament scoring rule, then verify to publish leaderboard points."
        actions={
          <ActionButton
            action={recalculateLeaderboardAction}
            fields={{ tournament_id: tournamentFilter }}
            label="Recalculate leaderboard"
            variant="secondary"
            size="sm"
          />
        }
      />

      <form className="flex flex-wrap items-end gap-2" action="/admin/results">
        <label htmlFor="tournament" className="font-display text-[10px] uppercase tracking-[0.18em] text-white/50">
          Filter tournament
        </label>
        <select
          id="tournament"
          name="tournament"
          defaultValue={tournamentFilter}
          className="h-9 rounded-md border border-white/10 bg-black/50 px-2 text-xs text-white"
        >
          <option value="">All tournaments</option>
          {(tournaments ?? []).map((tournament) => (
            <option key={(tournament as { id: string }).id} value={(tournament as { id: string }).id}>
              {(tournament as { name: string }).name}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md border border-white/10 px-3 font-display text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-rjnx-blue/40 hover:text-white">
          Apply
        </button>
      </form>

      <AdminPanel title={`Verification queue (${pending.length})`} description="Unverified results do not count toward leaderboards.">
        {pending.length ? (
          <div className="space-y-2">
            {pending.map((result) => (
              <div key={result.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{result.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{result.matchLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">#{result.placement ?? "—"}</Badge>
                  <Badge tone="neutral">{result.kills} kills</Badge>
                  <span className="font-display text-xs font-bold text-rjnx-blue">{result.total_points} pts</span>
                  <ActionButton action={verifyResultsAction} fields={{ result_id: result.id, verify: "true" }} label="Verify" variant="success" size="sm" />
                  <ActionButton action={verifyResultsAction} fields={{ result_id: result.id, verify: "false" }} label="Reject" variant="danger" size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ClipboardCheck className="size-6" />} title="Queue empty" description="All submitted results have been reviewed." />
        )}
      </AdminPanel>

      <AdminPanel title="Enter match results" description="Scores are calculated server-side from the tournament scoring rule.">
        {rows.length ? (
          <div className="space-y-4">
            {rows.map((match) => (
              <div key={match.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {match.tournament?.name} · R{match.round} #{match.match_number}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {match.participants.length} participants
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={match.status} />
                    <Link href={`/admin/tournaments/${match.tournament_id}`} className="text-[10px] uppercase tracking-[0.14em] text-rjnx-blue hover:underline">
                      Manage
                    </Link>
                  </div>
                </div>

                {match.participants.length ? (
                  <div className="mt-2.5 space-y-1.5">
                    {match.participants.map((participant) => {
                      const existing = participant.results[0];
                      return (
                        <ResultEntryForm
                          key={participant.id}
                          matchId={match.id}
                          participantId={participant.id}
                          label={participant.team?.name ?? participant.profile?.username ?? "Participant"}
                          existing={existing ?? null}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-white/30">
                    <Trophy className="size-3" /> No participants seeded for this match.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Trophy className="size-6" />} title="No matches to score" description="Create matches or generate a bracket first." />
        )}
      </AdminPanel>
    </div>
  );
}
