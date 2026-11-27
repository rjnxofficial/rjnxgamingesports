"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitResultAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function ResultEntryForm({
  matchId,
  participantId,
  label,
  existing,
}: {
  matchId: string;
  participantId: string;
  label: string;
  existing: { placement: number | null; kills: number; total_points: number; is_verified: boolean } | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(submitResultAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(`Result saved for ${label}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, label, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="participant_id" value={participantId} />
      <span className="min-w-32 flex-1 truncate text-xs text-white/80">{label}</span>
      <label className="sr-only" htmlFor={`placement-${participantId}`}>Placement</label>
      <Input
        id={`placement-${participantId}`}
        name="placement"
        type="number"
        min={1}
        max={200}
        defaultValue={existing?.placement ?? ""}
        placeholder="#"
        className="h-8 w-16 text-xs"
      />
      <label className="sr-only" htmlFor={`kills-${participantId}`}>Kills</label>
      <Input
        id={`kills-${participantId}`}
        name="kills"
        type="number"
        min={0}
        max={200}
        defaultValue={existing?.kills ?? 0}
        placeholder="kills"
        className="h-8 w-20 text-xs"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
      </Button>
      {existing ? (
        <span className="flex items-center gap-1.5">
          <Badge tone={existing.is_verified ? "green" : "amber"}>{existing.is_verified ? "verified" : "pending"}</Badge>
          <span className="font-display text-[11px] text-rjnx-blue">{existing.total_points} pts</span>
        </span>
      ) : (
        <Badge tone="neutral">no result</Badge>
      )}
    </form>
  );
}
