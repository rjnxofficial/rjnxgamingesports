import Link from "next/link";
import { Eye, EyeOff, Gamepad2, KeyRound, Radio } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/server/auth";
import { formatDate, relativeTime } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function MyMatchesPage() {
  const session = await requireUser("/dashboard/matches");

  const { data: registrations } = await session.supabase
    .from("tournament_registrations")
    .select("tournament_id, status")
    .eq("user_id", session.user.id)
    .in("status", ["pending", "approved"]);

  const tournamentIds = (registrations ?? []).map((row: { tournament_id: string }) => row.tournament_id);

  const { data: matches } = tournamentIds.length
    ? await session.supabase
        .from("matches")
        .select(
          "id, round, match_number, group_label, scheduled_at, status, map_name, room_published_at, tournament:tournaments(name, slug, game:games(name, short_name))",
        )
        .in("tournament_id", tournamentIds)
        .order("scheduled_at", { ascending: true })
    : { data: [] as unknown[] };

  const matchRows = (matches ?? []) as unknown as {
    id: string;
    round: number;
    match_number: number;
    group_label: string | null;
    scheduled_at: string | null;
    status: string;
    map_name: string | null;
    room_published_at: string | null;
    tournament: { name: string; slug: string; game: { name: string; short_name: string } | null } | null;
  }[];

  // Room credentials are fetched through the secure RPC — never from the base table.
  const credentials = new Map<string, { room_id: string; room_password: string }>();
  await Promise.all(
    matchRows
      .filter((match) => match.room_published_at)
      .map(async (match) => {
        const { data, error } = await session.supabase.rpc("match_room_credentials", { p_match_id: match.id });
        const row = Array.isArray(data) ? data[0] : null;
        if (!error && row?.room_id) {
          credentials.set(match.id, { room_id: row.room_id, room_password: row.room_password ?? "" });
        }
      }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Match center"
        title="My matches"
        subtitle="Schedules and private room details for every tournament you're registered in."
        actions={
          <Link href="/tournaments">
            <Button size="sm" variant="secondary">Find more events</Button>
          </Link>
        }
      />

      {matchRows.length ? (
        <div className="space-y-3">
          {matchRows.map((match) => {
            const room = credentials.get(match.id);
            return (
              <Card key={match.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={match.status} />
                      <Badge tone="purple">Round {match.round}{match.group_label ? ` · ${match.group_label}` : ""}</Badge>
                      <Badge tone="neutral">Match #{match.match_number}</Badge>
                    </div>
                    <p className="mt-2 font-display text-sm font-bold uppercase tracking-[0.06em] text-white">
                      {match.tournament?.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                      {match.tournament?.game?.short_name} · {match.map_name ?? "Map TBD"} ·{" "}
                      {match.scheduled_at ? formatDate(match.scheduled_at) : "Time TBD"}
                      {match.scheduled_at ? ` (${relativeTime(match.scheduled_at)})` : ""}
                    </p>
                  </div>

                  <div className="min-w-56">
                    {room ? (
                      <div className="rounded-md border border-rjnx-blue/30 bg-rjnx-blue/[0.06] p-3">
                        <p className="flex items-center gap-1.5 font-display text-[9px] uppercase tracking-[0.22em] text-rjnx-blue">
                          <KeyRound className="size-3" /> Room published
                        </p>
                        <dl className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/40">Room ID</dt>
                            <dd className="font-mono font-semibold text-white">{room.room_id}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-white/40">Password</dt>
                            <dd className="font-mono font-semibold text-white">{room.room_password || "—"}</dd>
                          </div>
                        </dl>
                      </div>
                    ) : match.room_published_at ? (
                      <div className="rounded-md border border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs text-amber-300">
                        <EyeOff className="mb-1 size-3" /> Room details are restricted to approved participants.
                      </div>
                    ) : (
                      <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/45">
                        <Eye className="mb-1 size-3" /> Room credentials drop 15 minutes before start.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No matches scheduled"
          description="Once you're approved in a tournament, its match schedule and room details appear here automatically."
          icon={<Gamepad2 className="size-6" />}
          action={
            <Link href="/tournaments">
              <Button size="sm">Register for a tournament</Button>
            </Link>
          }
        />
      )}

      <Card className="p-4">
        <p className="flex items-start gap-2 text-xs text-white/45">
          <Radio className="mt-0.5 size-3.5 text-rjnx-pink" />
          Room IDs and passwords are served by a security-definer function that verifies your approved
          registration on every request. They are never stored in the page HTML for unauthorised users.
        </p>
      </Card>
    </div>
  );
}
