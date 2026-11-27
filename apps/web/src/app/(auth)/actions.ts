"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ApiResult,
} from "@rjnx/shared";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env, serverEnv } from "@/lib/env";

async function siteOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("host");
  if (host) return `${host.includes("localhost") ? "http" : "https"}://${host}`;
  return env.siteUrl;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(_prev: ApiResult<null> | null, formData: FormData): Promise<ApiResult<null>> {
  const parsed = signInSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid credentials", field: issue?.path.join(".") };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { ok: false, error: error.message };
  }

  // Block suspended accounts right after authentication.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_suspended, suspended_reason")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: profile.suspended_reason
        ? `Account suspended: ${profile.suspended_reason}`
        : "This account is suspended. Contact support.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function signUpAction(_prev: ApiResult<null> | null, formData: FormData): Promise<ApiResult<null>> {
  const parsed = signUpSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
    username: text(formData, "username"),
    fullName: text(formData, "fullName"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid details", field: issue?.path.join(".") };
  }

  const supabase = await createServerSupabase();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", parsed.data.username)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "That username is already taken", field: "username" };
  }

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        full_name: parsed.data.fullName,
        username: parsed.data.username,
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Bootstrap admin: the first configured admin email is auto-granted super_admin
  // only when no super admin exists yet (verified server-side with the service role).
  const admin = createAdminClient();
  const adminEmails = serverEnv().adminEmails;
  if (admin && data.user && adminEmails.includes(parsed.data.email)) {
    const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    if (!count) {
      await admin.from("user_roles").insert({ user_id: data.user.id, role: "super_admin" });
      await admin.from("audit_logs").insert({
        actor_id: data.user.id,
        action: "role.bootstrap_super_admin",
        entity_type: "user",
        entity_id: data.user.id,
        metadata: { email: parsed.data.email, via: "signup" },
      });
    }
  }

  if (!data.session) {
    return {
      ok: true,
      data: null,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function forgotPasswordAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const parsed = forgotPasswordSchema.safeParse({ email: text(formData, "email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email", field: "email" };
  }

  const supabase = await createServerSupabase();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function resetPasswordAction(
  _prev: ApiResult<null> | null,
  formData: FormData,
): Promise<ApiResult<null>> {
  const parsed = resetPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid password", field: issue?.path.join(".") };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function resendVerificationAction(): Promise<ApiResult<null>> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sign in first" };
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
