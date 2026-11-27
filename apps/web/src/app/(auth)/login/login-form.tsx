"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { safeNextPath, type ApiResult } from "@rjnx/shared";
import { signInAction } from "../actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-origin absolute paths are allowed (no open redirects).
  const next = safeNextPath(searchParams.get("next"), "/dashboard");
  const urlError = searchParams.get("error");
  const checkEmail = searchParams.get("check") === "email";

  const [state, formAction] = useActionState<ApiResult<null> | null, FormData>(signInAction, null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Welcome back, savage.");
      router.replace(next);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router, next]);

  return (
    <form action={formAction} className="space-y-4">
      {checkEmail ? (
        <Alert variant="info" title="Verify your email">
          Account created. Confirm your email address, then sign in here.
        </Alert>
      ) : null}
      {urlError ? <Alert variant="error" title="Sign in failed">{urlError}</Alert> : null}
      {state && !state.ok ? <Alert variant="error" title="Sign in failed">{state.error}</Alert> : null}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
      </Field>

      <div className="flex items-center justify-between text-xs">
        <Link href="/forgot-password" className="text-rjnx-blue hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-white/50 hover:text-white">
          Need an account?
        </Link>
      </div>

      <SubmitButton className="w-full">Sign in</SubmitButton>
    </form>
  );
}
