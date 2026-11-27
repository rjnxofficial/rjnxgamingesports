"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { ApiResult } from "@rjnx/shared";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ApiResult<null> | null, FormData>(forgotPasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok ? (
        <Alert variant="success" title="Reset link sent">
          Check your inbox (and spam folder). The link expires in 60 minutes.
        </Alert>
      ) : null}
      {state && !state.ok ? <Alert variant="error" title="Request failed">{state.error}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </form>
  );
}
