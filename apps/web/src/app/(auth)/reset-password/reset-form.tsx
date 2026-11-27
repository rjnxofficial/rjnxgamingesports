"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { ApiResult } from "@rjnx/shared";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<ApiResult<null> | null, FormData>(resetPasswordAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Password updated. Sign in with your new password.");
      router.replace("/login");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok ? <Alert variant="success" title="Password updated">You can now sign in.</Alert> : null}
      {state && !state.ok ? <Alert variant="error" title="Could not update password">{state.error}</Alert> : null}

      <Field label="New password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <SubmitButton className="w-full">Update password</SubmitButton>
    </form>
  );
}
