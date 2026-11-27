import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ROLE_WEIGHT, type Profile, type Role } from "@rjnx/shared";
import { supabase } from "./supabase";

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; username: string; fullName: string }) => Promise<{
    needsConfirmation: boolean;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<{ profile: Profile | null; roles: Role[] }> {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const roles = ((roleRows ?? []) as { role: string }[])
    .map((row) => row.role)
    .filter((role): role is Role => role in ROLE_WEIGHT);
  return { profile: (profile as Profile | null) ?? null, roles: roles.length ? roles : ["player"] };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [roles, setRoles] = React.useState<Role[]>(["player"]);

  const hydrate = React.useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (nextSession?.user) {
      const result = await loadProfile(nextSession.user.id);
      setProfile(result.profile);
      setRoles(result.roles);
    } else {
      setProfile(null);
      setRoles(["player"]);
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        await hydrate(data.session);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [hydrate]);

  const refreshProfile = React.useCallback(async () => {
    if (!session?.user) return;
    const result = await loadProfile(session.user.id);
    setProfile(result.profile);
    setRoles(result.roles);
  }, [session]);

  const value = React.useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isStaff: roles.some((role) => ROLE_WEIGHT[role] >= ROLE_WEIGHT.moderator),
      refreshProfile,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      async signUp({ email, password, username, fullName }) {
        const { data: existing } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
        if (existing) throw new Error("That username is already taken");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, username },
            emailRedirectTo: `rjnx://auth/callback`,
          },
        });
        if (error) throw new Error(error.message);
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
        await hydrate(null);
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: "rjnx://auth/callback" });
        if (error) throw new Error(error.message);
      },
    }),
    [ready, session, profile, roles, refreshProfile, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
