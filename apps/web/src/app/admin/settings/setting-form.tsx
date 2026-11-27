"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { saveSettingAction } from "@/server/actions/admin";
import type { ApiResult } from "@rjnx/shared";

export function SettingForm({
  defaults,
}: {
  defaults?: { key: string; value: string; description: string };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ApiResult<null> | null, FormData>(saveSettingAction, null);
  const id = defaults?.key ?? "new";

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Setting saved.");
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-2">
      {state && !state.ok ? <Alert variant="error">{state.error}</Alert> : null}
      <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
        <Field label="Key" htmlFor={`key-${id}`} required>
          <Input id={`key-${id}`} name="key" required defaultValue={defaults?.key} readOnly={Boolean(defaults)} />
        </Field>
        <Field label="Value (JSON or plain text)" htmlFor={`value-${id}`} required>
          <Input id={`value-${id}`} name="value" required defaultValue={defaults?.value} />
        </Field>
      </div>
      <Field label="Description" htmlFor={`desc-${id}`}>
        <Input id={`desc-${id}`} name="description" defaultValue={defaults?.description} />
      </Field>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save setting
      </Button>
    </form>
  );
}
