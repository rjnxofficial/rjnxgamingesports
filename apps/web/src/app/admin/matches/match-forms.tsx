"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { createMatchAction, publishRoomAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function MatchCreateForm({
  tournaments,
  defaultTournament,
}: {
  tournaments: { id: string; name: string; status: string }[];
  defaultTournament: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(createMatchAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Match created and participants seeded.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {state && !state.ok ? <Alert variant="error" className="sm:col-span-2 lg:col-span-6">{state.error}</Alert> : null}
      <Field label="Tournament" htmlFor="tournament_id" className="sm:col-span-2" required>
        <Select id="tournament_id" name="tournament_id" defaultValue={defaultTournament} required>
          <option value="">Select tournament…</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Round" htmlFor="round" required>
        <Input id="round" name="round" type="number" min={1} max={50} defaultValue={1} required />
      </Field>
      <Field label="Match #" htmlFor="match_number" required>
        <Input id="match_number" name="match_number" type="number" min={1} max={500} defaultValue={1} required />
      </Field>
      <Field label="Scheduled at" htmlFor="scheduled_at">
        <Input id="scheduled_at" name="scheduled_at" type="datetime-local" />
      </Field>
      <Field label="Map" htmlFor="map_name">
        <Input id="map_name" name="map_name" placeholder="Erangel" />
      </Field>
      <div className="sm:col-span-2 lg:col-span-6">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create match
        </Button>
      </div>
    </form>
  );
}

export function MatchRoomForms({
  matchId,
  defaultRoomId,
  defaultPassword,
  published,
}: {
  matchId: string;
  defaultRoomId: string;
  defaultPassword: string;
  published: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(publishRoomAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Room credentials published to participants.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="match_id" value={matchId} />
      <Field label="Room ID" htmlFor={`room-${matchId}`} className="min-w-36 flex-1">
        <Input id={`room-${matchId}`} name="room_id" defaultValue={defaultRoomId} required placeholder="88421334" />
      </Field>
      <Field label="Password" htmlFor={`pass-${matchId}`} className="min-w-32 flex-1">
        <Input id={`pass-${matchId}`} name="room_password" defaultValue={defaultPassword} required placeholder="rjnx123" />
      </Field>
      <Button type="submit" size="sm" variant={published ? "secondary" : "outline"} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
        {published ? "Update & renotify" : "Publish room"}
      </Button>
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
    </form>
  );
}
