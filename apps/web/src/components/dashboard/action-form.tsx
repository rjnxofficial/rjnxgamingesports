"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ApiResult } from "@rjnx/shared";

type Action = (prev: ApiResult<null> | null, formData: FormData) => Promise<ApiResult<null>>;

/**
 * Small client wrapper that runs a server action with feedback.
 * Used for compact admin/dashboard mutations (approve, verify, delete…).
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  variant = "secondary",
  size = "sm",
  confirm,
  className,
  onDone,
}: {
  action: Action;
  fields: Record<string, string | number | boolean>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirm?: string;
  className?: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ApiResult<null> | null, FormData>(action, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(`${label} succeeded`);
      onDone?.();
    } else {
      toast.error(state.error);
    }
  }, [state, label, onDone]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={String(value)} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {pending && pendingLabel ? pendingLabel : label}
      </Button>
      {state && !state.ok ? <Alert variant="error" className="mt-2">{state.error}</Alert> : null}
    </form>
  );
}
