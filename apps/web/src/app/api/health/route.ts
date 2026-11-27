import { NextResponse } from "next/server";
import { dataClient } from "@/lib/supabase/safe";
import { hasServiceRole } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Lightweight health probe used by CI smoke tests and uptime monitors. */
export async function GET() {
  const started = Date.now();
  let database = "unknown";
  let detail: string | null = null;

  try {
    const supabase = await dataClient();
    const { error } = await supabase.from("games").select("id").limit(1);
    database = error ? "error" : "ok";
    detail = error?.message ?? null;
  } catch (error) {
    database = "unreachable";
    detail = error instanceof Error ? error.message : "unknown";
  }

  return NextResponse.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      service: "rjnx-web",
      database,
      detail,
      serviceRole: hasServiceRole() ? "configured" : "missing",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
