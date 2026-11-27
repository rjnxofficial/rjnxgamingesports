"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { broadcastNotificationAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function BroadcastForm({ tournaments }: { tournaments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ApiResult<null> | null, FormData>(broadcastNotificationAction, null);
  const [audience, setAudience] = React.useState("all");

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Broadcast sent.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <Field label="Audience" htmlFor="audience" required>
          <Select id="audience" name="audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="all">Everyone</option>
            <option value="players">Players only</option>
            <option value="staff">Staff only</option>
            <option value="tournament">Tournament participants</option>
            <option value="user">Single player (by ID)</option>
          </Select>
        </Field>
        <Field label="Type" htmlFor="type" required>
          <Select id="type" name="type" defaultValue="announcement">
            {["announcement", "admin", "match", "result", "winner", "room", "payment", "system"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Field>
      </div>

      {audience === "tournament" ? (
        <Field label="Tournament" htmlFor="tournament_id" required>
          <Select id="tournament_id" name="tournament_id" required>
            <option value="">Select tournament…</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </Select>
        </Field>
      ) : null}

      {audience === "user" ? (
        <Field label="Player user ID" htmlFor="user_id" required hint="Copy the UUID from Admin → Users">
          <Input id="user_id" name="user_id" required placeholder="00000000-0000-0000-0000-000000000000" />
        </Field>
      ) : null}

      <Field label="Title" htmlFor="title" required>
        <Input id="title" name="title" required minLength={3} maxLength={120} placeholder="Room details are live" />
      </Field>
      <Field label="Body" htmlFor="body">
        <Textarea id="body" name="body" rows={3} maxLength={600} placeholder="Open your match center for round 1 credentials." />
      </Field>
      <Field label="Link" htmlFor="link" hint="Optional in-app path">
        <Input id="link" name="link" placeholder="/dashboard/matches" maxLength={300} />
      </Field>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send broadcast
      </Button>
    </form>
  );
}
