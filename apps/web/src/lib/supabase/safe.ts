import "server-only";
import type { RjnxClient } from "./types";
import { createServerSupabase } from "./server";

/**
 * Returns a Supabase client for data reads, falling back to a stateless
 * publishable-key client when cookie access is unavailable (prerender, static
 * export, outage). RLS still applies — this never grants extra access.
 */
export async function dataClient(): Promise<RjnxClient> {
  try {
    return await createServerSupabase();
  } catch {
    const { createClient } = await import("@supabase/supabase-js");
    const { optionalEnv } = await import("@/lib/env");
    const config = optionalEnv();
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      db: { schema: "rjnx" },
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as RjnxClient;
  }
}
