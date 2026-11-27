import { KeyRound, Swords } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { MatchRoomForms, MatchCreateForm } from "./match-forms";
import { requireStaff } from "@/server/auth";
import { updateMatchStatusAction } from "@/server/actions/admin";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMatchesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tournamentFilter = (Array.isArray(params.tournament) ? params.tournament[0] : params.tournament) ?? "";
  const session = await requireStaff("/admin/matches");

  const { data: tournaments } = await session.supabase
    .from("tournaments")
    .select("id, name, slug, status")
    .in("status", ["published", "registration_open", "registration_closed", "live", "completed"])
    .order("starts_at", { ascending: false })
    .limit(100);

  let matchQuery = session.supabase
    .from("matches")
    .select("id, round, match_number, scheduled_at, status, map_name, room_id, room_password, room_published_at, tournament:tournaments(id, name, slug), participants:match_participants(id, team:teams(name), profile:profiles(username))")
    .order("scheduled_at", { ascending: true })
    .limit(150);
  if (tournamentFilter) matchQuery = matchQuery.eq("tournament_id", tournamentFilter);

  const { data: matches } = await matchQuery;

  const rows = (matches ?? []) as unknown as {
    id: string;
    round: number;
    match_number: number;
    scheduled_at: string | null;
    status: string;
    map_name: string | null;
    room_id: string | null;
    room_password: string | null;
    room_published_at: string | null;
    tournament: { id: string; name: string; slug: string } | null;
    participants: { id: string; team: { name: string } | null; profile: { username: string } | null }[];
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Matches & room credentials"
        subtitle="Create matches, set schedules and publish room IDs to eligible participants only."
      />

      <AdminPanel title="Create match" description="Participants are auto-seeded from approved registrations.">
        <MatchCreateForm
          tournaments={(tournaments ?? []) as { id: string; name: string; status: string }[]}
          defaultTournament={tournamentFilter}
        />
      </AdminPanel>

      <AdminPanel title={`${rows.length} matches`} description="Room credentials are hidden from the public API and served only through the eligibility RPC.">
        {rows.length ? (
          <div className="space-y-2.5">
            {rows.map((match) => (
              <div key={match.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {match.tournament?.name} · R{match.round} #{match.match_number}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {match.scheduled_at ? formatDate(match.scheduled_at) : "unscheduled"} · {match.map_name ?? "map TBD"} ·{" "}
                      {match.participants.length} participants
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={match.status} />
                    {match.room_published_at ? <Badge tone="purple">published</Badge> : null}
                  </div>
                </div>

                <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_auto]">
                  <MatchRoomForms
                    matchId={match.id}
                    defaultRoomId={match.room_id ?? ""}
                    defaultPassword={match.room_password ?? ""}
                    published={Boolean(match.room_published_at)}
                  />
                  <div className="flex flex-wrap items-start gap-1">
                    {["live", "awaiting_verification", "cancelled", "scheduled"].map((status) => (
                      <ActionButton
                        key={status}
                        action={updateMatchStatusAction}
                        fields={{ match_id: match.id, status }}
                        label={status.replace(/_/g, " ")}
                        variant="ghost"
                        size="sm"
                      />
                    ))}
                  </div>
                </div>

                {match.participants.length ? (
                  <p className="mt-2 flex flex-wrap gap-1 text-[10px] text-white/40">
                    {match.participants.map((participant) => (
                      <span key={participant.id} className="rounded bg-white/5 px-1.5 py-0.5">
                        {participant.team?.name ?? participant.profile?.username}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Swords className="size-6" />} title="No matches" description="Create a match or generate a bracket from a tournament page." />
        )}
      </AdminPanel>

      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
        <KeyRound className="size-3" /> Publishing a room notifies every participant instantly.
      </p>
    </div>
  );
}
