import { Crown, Mail, Shield, UserMinus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { TeamForms } from "./team-forms";
import { requireUser } from "@/server/auth";
import { getGames } from "@/server/queries";
import { removeMemberAction, respondInvitationAction, transferCaptainAction } from "@/server/actions/player";
import { initials } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await requireUser("/dashboard/teams");
  const games = await getGames();

  const { data: membership } = await session.supabase
    .from("team_members")
    .select("team_id, role, team:teams(id, name, tag, logo_url, game_id, captain_id, game:games(name, short_name))")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const team = (membership as unknown as {
    team_id: string;
    role: string;
    team: { id: string; name: string; tag: string | null; logo_url: string | null; game_id: string | null; captain_id: string; game: { name: string; short_name: string } | null } | null;
  } | null) ?? null;

  const [{ data: members }, { data: incoming }, { data: outgoing }, { data: teamRegistrations }] = await Promise.all([
    team
      ? session.supabase
          .from("team_members")
          .select("id, user_id, role, joined_at, profile:profiles(id, username, avatar_url, in_game_name)")
          .eq("team_id", team.team_id)
          .order("role")
      : Promise.resolve({ data: [] as unknown[] }),
    session.supabase
      .from("team_invitations")
      .select("id, message, created_at, team:teams(id, name, tag), inviter:profiles!team_invitations_inviter_id_fkey(username)")
      .eq("invitee_id", session.user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    team
      ? session.supabase
          .from("team_invitations")
          .select("id, status, created_at, invitee:profiles!team_invitations_invitee_id_fkey(username, avatar_url)")
          .eq("team_id", team.team_id)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as unknown[] }),
    team
      ? session.supabase
          .from("tournament_registrations")
          .select("id, status, tournament:tournaments(name, slug, starts_at)")
          .eq("team_id", team.team_id)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const memberRows = (members ?? []) as unknown as {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profile: { id: string; username: string; avatar_url: string | null; in_game_name: string | null } | null;
  }[];

  const isCaptain = team?.team?.captain_id === session.user.id;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Squad"
        title={team ? team.team?.name ?? "My team" : "Team management"}
        subtitle={
          team
            ? `${team.team?.game?.name ?? "Open"} squad · ${memberRows.length} member${memberRows.length === 1 ? "" : "s"}`
            : "Create a squad, invite players, and register for team-format tournaments."
        }
      />

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
          <Mail className="size-4 text-rjnx-pink" /> Team invitations
        </h2>
        {incoming?.length ? (
          <ul className="mt-3 space-y-2">
            {(incoming as unknown as {
              id: string;
              message: string | null;
              created_at: string;
              team: { id: string; name: string; tag: string | null } | null;
              inviter: { username: string } | null;
            }[]).map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {invitation.team?.name} <span className="text-white/40">[{invitation.team?.tag ?? "—"}]</span>
                  </p>
                  <p className="text-[11px] text-white/45">
                    Invited by {invitation.inviter?.username ?? "a captain"}
                    {invitation.message ? ` — "${invitation.message}"` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionButton action={respondInvitationAction} fields={{ invitation_id: invitation.id, decision: "accept" }} label="Accept" variant="success" />
                  <ActionButton action={respondInvitationAction} fields={{ invitation_id: invitation.id, decision: "reject" }} label="Decline" variant="danger" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-rjnx-muted">No pending invitations.</p>
        )}
      </Card>

      {team && team.team ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                  <Users className="size-4 text-rjnx-blue" /> Roster
                </h2>
                <Badge tone="blue">{memberRows.length} members</Badge>
              </div>
              <ul className="mt-3 divide-y divide-white/[0.05]">
                {memberRows.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rjnx-blue to-rjnx-purple font-display text-[10px] font-black text-black">
                      {member.profile?.avatar_url ? (
                         
                        <img src={member.profile.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        initials(member.profile?.username)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                        {member.profile?.username}
                        {member.role === "captain" ? <Crown className="size-3 text-amber-300" /> : null}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                        {member.profile?.in_game_name ?? "IGN not set"} · {member.role}
                      </p>
                    </div>
                    {isCaptain && member.user_id !== session.user.id ? (
                      <div className="flex gap-1">
                        <ActionButton
                          action={transferCaptainAction}
                          fields={{ team_id: team.team_id, user_id: member.user_id }}
                          label="Make captain"
                          confirm="Transfer captaincy to this player?"
                          size="sm"
                          variant="ghost"
                        />
                        <ActionButton
                          action={removeMemberAction}
                          fields={{ team_id: team.team_id, user_id: member.user_id }}
                          label="Remove"
                          confirm="Remove this player from the team?"
                          size="sm"
                          variant="danger"
                        />
                      </div>
                    ) : null}
                    {member.user_id === session.user.id && !isCaptain ? (
                      <ActionButton
                        action={removeMemberAction}
                        fields={{ team_id: team.team_id, user_id: member.user_id, leave: "1" }}
                        label="Leave"
                        confirm="Leave this team?"
                        size="sm"
                        variant="danger"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
                  <Shield className="size-4 text-rjnx-purple" /> Team tools
                </h2>
                <TeamForms
                  mode="manage"
                  teamId={team.team_id}
                  isCaptain={Boolean(isCaptain)}
                  games={games.map((game) => ({ id: game.id, name: game.name }))}
                  defaults={{
                    name: team.team.name,
                    tag: team.team.tag ?? "",
                    game_id: team.team.game_id ?? "",
                  }}
                />
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Outgoing invitations</h2>
                {outgoing?.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {(outgoing as unknown as {
                      id: string;
                      status: string;
                      invitee: { username: string } | null;
                    }[]).map((invitation) => (
                      <li key={invitation.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-white/75">{invitation.invitee?.username}</span>
                        <Badge tone={invitation.status === "accepted" ? "green" : invitation.status === "pending" ? "amber" : "neutral"}>
                          {invitation.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-rjnx-muted">No invitations sent yet.</p>
                )}
              </Card>
            </div>
          </div>

          <Card className="p-5">
            <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Team tournament history</h2>
            {teamRegistrations?.length ? (
              <ul className="mt-3 divide-y divide-white/[0.05]">
                {(teamRegistrations as unknown as {
                  id: string;
                  status: string;
                  tournament: { name: string; slug: string; starts_at: string } | null;
                }[]).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <a href={`/tournaments/${row.tournament?.slug}`} className="text-white/80 hover:text-rjnx-blue">
                      {row.tournament?.name}
                    </a>
                    <Badge tone={row.status === "approved" ? "green" : "amber"}>{row.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-rjnx-muted">This team has not entered a tournament yet.</p>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-5">
          <EmptyState
            title="You're not in a team yet"
            description="Create a squad to compete in duo and squad tournaments. You can invite players by username once it exists."
            icon={<Users className="size-6" />}
          />
          <div className="mt-4">
            <TeamForms mode="create" isCaptain games={games.map((game) => ({ id: game.id, name: game.name }))} />
          </div>
        </Card>
      )}

      {team && isCaptain ? (
        <Card className="border-rjnx-red/25 p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-rjnx-red">
            <UserMinus className="size-4" /> Danger zone
          </h2>
          <p className="mt-2 text-xs text-white/45">
            Disbanding removes the team and all memberships. Registrations tied to this team remain in your history.
          </p>
          <div className="mt-3">
            <TeamForms mode="disband" teamId={team.team_id} isCaptain games={[]} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
