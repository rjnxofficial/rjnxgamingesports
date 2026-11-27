"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath, type ApiResult } from "@rjnx/shared";
import { signUpAction } from "../actions";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/dashboard");
  const [state, formAction] = useActionState<ApiResult<null> | null, FormData>(signUpAction, null);
  const [username, setUsername] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      (async () => {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          toast.success("Account created. Welcome to RJNX.");
          router.replace(next);
          router.refresh();
        } else {
          toast.success("Account created. Check your email to verify, then sign in.");
          router.replace(`/login?check=email&next=${encodeURIComponent(next)}`);
        }
      })();
    } else {
      toast.error(state.error);
    }
  }, [state, router, next]);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok ? <Alert variant="error" title="Could not create account">{state.error}</Alert> : null}

      <Field label="Full name" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" autoComplete="name" required placeholder="Savage One" />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        hint={username ? `Your handle will be @${username}` : "3–24 characters · letters, numbers, _ and ."}
        required
      >
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
          required
          minLength={3}
          maxLength={24}
          placeholder="savage_one"
        />
      </Field>

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters with one letter and one number" required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="••••••••" />
      </Field>

      <Checkbox
        label="I agree to the Terms and Fair Play policy"
        checked={agreed}
        onChange={(event) => setAgreed(event.target.checked)}
      />

      <SubmitButton className="w-full" disabled={!agreed}>
        Create account
      </SubmitButton>

      <p className="text-center text-[11px] text-white/35">
        By joining you accept our{" "}
        <Link href="/terms" className="text-rjnx-blue hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-rjnx-blue hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
