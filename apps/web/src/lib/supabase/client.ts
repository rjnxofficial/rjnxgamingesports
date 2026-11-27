"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { RjnxClient } from "./types";
import { optionalEnv } from "@/lib/env";
import { RJNX_SCHEMA } from "./schema";

export { RJNX_SCHEMA };

let browserClient: RjnxClient | null = null;

/** Browser Supabase client (publishable key only). */
export function createClient(): RjnxClient {
  if (!browserClient) {
    const config = optionalEnv();
    browserClient = createBrowserClient<any, "rjnx">(config.supabaseUrl, config.supabaseAnonKey, {
      db: { schema: RJNX_SCHEMA },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
