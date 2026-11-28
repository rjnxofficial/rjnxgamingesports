import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { RjnxClient } from "@/lib/supabase/types";
import { createServerSupabase } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { ROLE_WEIGHT, type Profile, type Role } from "@rjnx/shared";

export interface SessionContext {
  supabase: RjnxClient;
  user: User;
  profile: Profile | null;
  roles: Role[];
  isStaff: boolean;
  isSuperAdmin: boolean;
}

function normaliseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return ["player"];
  return value
    .map((row) => (typeof row === "string" ? row : (row as { role?: string })?.role))
    .filter((role): role is Role => typeof role === "string" && role in ROLE_WEIGHT);
}

/** Returns the current session context or null when signed out. */
export async function getSessionContext(): Promise<SessionContext | null> {
  // No configuration means no session; it must not throw during prerender or
  // when a deployment is missing its environment variables.
  if (!hasSupabaseConfig()) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roles = normaliseRoles(roleRows ?? []);
  const effective = roles.length ? roles : ["player" as Role];

  return {
    supabase,
    user,
    profile: (profile as Profile | null) ?? null,
    roles: effective,
    isStaff: effective.some((role) => ROLE_WEIGHT[role] >= ROLE_WEIGHT.moderator),
    isSuperAdmin: effective.includes("super_admin"),
  };
}

/** The path being rendered, forwarded by middleware (falls back to undefined). */
export async function currentPath(): Promise<string | undefined> {
  try {
    const headerStore = await headers();
    const value = headerStore.get("x-rjnx-path");
    return value && value.startsWith("/") ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Session or redirect to /login, remembering where the player was headed. */
export async function requireUser(nextPath?: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    const target = nextPath ?? (await currentPath()) ?? "/dashboard";
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  if (context.profile?.is_suspended) {
    redirect("/suspended");
  }
  return context;
}

/** Staff-only guard (moderator and above). */
export async function requireStaff(nextPath?: string): Promise<SessionContext> {
  const context = await requireUser(nextPath);
  if (!context.isStaff) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}

/** Super-admin-only guard. */
export async function requireSuperAdmin(nextPath?: string): Promise<SessionContext> {
  const context = await requireUser(nextPath);
  if (!context.isSuperAdmin) {
    redirect("/admin?error=super_admin_only");
  }
  return context;
}

export async function hasRole(role: Role): Promise<boolean> {
  const context = await getSessionContext();
  return Boolean(context?.roles.includes(role));
}
