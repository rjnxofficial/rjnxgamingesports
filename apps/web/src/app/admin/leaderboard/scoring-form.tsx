"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import type { ApiResult } from "@rjnx/shared";

type Action = (prev: ApiResult<null> | null, formData: FormData) => Promise<ApiResult<null>>;

export function ScoringRuleForm({ action }: { action: Action }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ApiResult<null> | null, FormData>(action, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Scoring rule saved.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.6fr]">
        <Field label="Rule name" htmlFor="rule-name" required>
          <Input id="rule-name" name="name" required minLength={3} maxLength={60} placeholder="RJNX Battle Royale Standard" />
        </Field>
        <Field label="Points per kill" htmlFor="kill_points" required>
          <Input id="kill_points" name="kill_points" type="number" min={0} max={50} defaultValue={1} required />
        </Field>
      </div>

      <div>
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Placement points</p>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }).map((_, index) => {
            const place = index + 1;
            const defaults = [12, 9, 7, 5, 4, 3, 2, 1, 0, 0];
            return (
              <label key={place} className="text-center">
                <span className="block text-[9px] uppercase tracking-[0.14em] text-white/35">#{place}</span>
                <Input
                  name={`placement_${place}`}
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={defaults[index]}
                  className="mt-0.5 h-8 px-1 text-center text-xs"
                  aria-label={`Points for placement ${place}`}
                />
              </label>
            );
          })}
        </div>
      </div>

      <Checkbox label="Make this the default scoring rule" name="is_default" />

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save scoring rule
      </Button>
    </form>
  );
}
