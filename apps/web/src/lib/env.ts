/**
 * Centralised environment access. Public values are inlined by Next.js;
 * privileged values are only ever read on the server.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length < 8) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill in your Supabase project values.`,
    );
  }
  return value;
}

/**
 * The project URL and publishable key belong in the environment
 * (`apps/web/.env.local`, Vercel project settings, GitHub secrets). They are
 * deliberately NOT hard-coded here: a deployment that forgets them must fail
 * loudly at request time instead of silently talking to someone's project.
 */
export const env = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get siteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

/**
 * Safe accessor for code paths that must render *something* even when the
 * deployment is missing its environment (layout metadata, health, error pages).
 * Returns the configured project or a clearly invalid placeholder, so a real
 * request fails with a readable Supabase error instead of crashing a render.
 */
export function optionalEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return {
    configured: Boolean(url && anonKey),
    supabaseUrl: url || "https://not-configured.supabase.co",
    supabaseAnonKey: anonKey || "not-configured",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}

/** True when the public Supabase configuration is present. */
export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Server-only privileged configuration. Never import from a client component. */
export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    adminEmails: (process.env.RJNX_BOOTSTRAP_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    databaseUrl: process.env.DATABASE_URL ?? "",
  };
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
