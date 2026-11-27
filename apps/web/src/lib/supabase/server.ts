import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { RjnxClient } from "./types";
import { env } from "@/lib/env";
import { RJNX_SCHEMA } from "./client";

/**
 * Server Supabase client bound to the request cookies.
 * The session is read-only inside Server Components; cookie writes are handled
 * by middleware.ts.
 */
export async function createServerSupabase(): Promise<RjnxClient> {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    db: { schema: RJNX_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}
