import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { RjnxClient } from "./types";
import { optionalEnv, hasServiceRole } from "@/lib/env";
import { RJNX_SCHEMA } from "./schema";

let adminClient: RjnxClient | null = null;

/**
 * Service-role client. Bypasses RLS — only for trusted server tasks
 * (audit logging, notification fan-out, admin stats). Never import in a
 * client component; "server-only" enforces that at build time.
 */
export function createAdminClient(): RjnxClient | null {
  if (!hasServiceRole()) return null;
  if (!adminClient) {
    const config = optionalEnv();
    adminClient = createClient(config.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
      db: { schema: RJNX_SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
