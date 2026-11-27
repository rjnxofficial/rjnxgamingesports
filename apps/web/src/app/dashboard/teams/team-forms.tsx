"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import type { ApiResult } from "@rjnx/shared";
import {
  createTeamAction,
  disbandTeamAction,
  inviteMemberAction,
  updateTeamAction,
} from "@/server/actions/player";

type Mode = "create" | "manage" | "disband";

export function TeamForms({
  mode,
  teamId,
  isCaptain,
  games,
  defaults,
}: {
  mode: Mode;
  teamId?: string;
  isCaptain: boolean;
  games: { id: string; name: string }[];
  defaults?: { name: string; tag: string; game_id: string };
}) {
  const router = useRouter();
  const createAction = useActionState<ApiResult<null> | null, FormData>(createTeamAction, null);
  const updateAction = useActionState<ApiResult<null> | null, FormData>(updateTeamAction, null);
  const inviteAction = useActionState<ApiResult<null> | null, FormData>(inviteMemberAction, null);
  const disbandAction = useActionState<ApiResult<null> | null, FormData>(disbandTeamAction, null);

  const [createState, createSubmit, creating] = createAction;
  const [updateState, updateSubmit, updating] = updateAction;
  const [inviteState, inviteSubmit, inviting] = inviteAction;
  const [disbandState, disbandSubmit, disbanding] = disbandAction;

  React.useEffect(() => {
    for (const state of [createState, updateState, inviteState, disbandState]) {
      if (state?.ok) router.refresh();
    }
  }, [createState, updateState, inviteState, disbandState, router]);

  React.useEffect(() => {
    if (createState?.ok) toast.success("Team created.");
    if (updateState?.ok) toast.success("Team updated.");
    if (inviteState?.ok) toast.success("Invitation sent.");
    if (disbandState?.ok) toast.success("Team disbanded.");
    for (const state of [createState, updateState, inviteState, disbandState]) {
      if (state && !state.ok) toast.error(state.error);
    }
  }, [createState, updateState, inviteState, disbandState]);

  if (mode === "create") {
    return (
      <form action={createSubmit} className="space-y-3">
        {createState && !createState.ok ? <Alert variant="error" title="Could not create team">{createState.error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-[1.6fr_0.6fr]">
          <Field label="Team name" htmlFor="team-name" required>
            <Input id="team-name" name="name" required minLength={3} maxLength={40} placeholder="Savage Squad" />
          </Field>
          <Field label="Tag" htmlFor="team-tag" hint="Max 6 chars">
            <Input id="team-tag" name="tag" maxLength={6} placeholder="SVG" />
          </Field>
        </div>
        <Field label="Primary game" htmlFor="team-game">
          <Select id="team-game" name="game_id" defaultValue="">
            <option value="">Open / mixed</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </Select>
        </Field>
        <Button type="submit" disabled={creating}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create team
        </Button>
      </form>
    );
  }

  if (mode === "manage") {
    if (!isCaptain) {
      return <p className="mt-2 text-xs text-white/45">Only the captain can edit team details or invite players.</p>;
    }
    return (
      <div className="mt-3 space-y-5">
        <form action={updateSubmit} className="space-y-3">
          <input type="hidden" name="team_id" value={teamId} />
          {updateState && !updateState.ok ? <Alert variant="error" title="Update failed">{updateState.error}</Alert> : null}
          <Field label="Team name" htmlFor="edit-name" required>
            <Input id="edit-name" name="name" defaultValue={defaults?.name} required minLength={3} maxLength={40} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag" htmlFor="edit-tag">
              <Input id="edit-tag" name="tag" defaultValue={defaults?.tag} maxLength={6} />
            </Field>
            <Field label="Game" htmlFor="edit-game">
              <Select id="edit-game" name="game_id" defaultValue={defaults?.game_id}>
                <option value="">Open / mixed</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary" disabled={updating}>
            {updating ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
          </Button>
        </form>

        <div className="border-t border-white/[0.07] pt-4">
          <form action={inviteSubmit} className="space-y-2">
            <input type="hidden" name="team_id" value={teamId} />
            {inviteState && !inviteState.ok ? <Alert variant="error" title="Invite failed">{inviteState.error}</Alert> : null}
            <Field label="Invite player by username" htmlFor="invite-username" required>
              <Input id="invite-username" name="username" required placeholder="savage_one" />
            </Field>
            <Field label="Message (optional)" htmlFor="invite-message">
              <Input id="invite-message" name="message" maxLength={200} placeholder="Join the squad for Friday's clash" />
            </Field>
            <Button type="submit" variant="outline" disabled={inviting}>
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Send invite
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form action={disbandSubmit}>
      <input type="hidden" name="team_id" value={teamId} />
      {disbandState && !disbandState.ok ? <Alert variant="error" title="Failed">{disbandState.error}</Alert> : null}
      <Button
        type="submit"
        variant="danger"
        size="sm"
        disabled={disbanding}
        onClick={(event) => {
          if (!window.confirm("Disband this team permanently? This cannot be undone.")) event.preventDefault();
        }}
      >
        {disbanding ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Disband team
      </Button>
    </form>
  );
}
