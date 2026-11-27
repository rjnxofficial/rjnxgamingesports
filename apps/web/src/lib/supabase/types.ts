/** Minimal schema-typed aliases so the rjnx schema is accepted everywhere. */
export type RjnxClient = import("@supabase/supabase-js").SupabaseClient<any, "rjnx", any>;
