"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { RjnxClient } from "./types";
import { env } from "@/lib/env";

export const RJNX_SCHEMA = "rjnx";

let browserClient: RjnxClient | null = null;

/** Browser Supabase client (publishable key only). */
export function createClient(): RjnxClient {
  if (!browserClient) {
    browserClient = createBrowserClient<any, "rjnx">(env.supabaseUrl, env.supabaseAnonKey, {
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
