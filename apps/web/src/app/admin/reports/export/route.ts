import { NextResponse } from "next/server";
import { getSessionContext } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_WEIGHT } from "@rjnx/shared";

export const dynamic = "force-dynamic";

/**
 * CSV export for the admin reports page.
 *
 * Server-side only: the session is resolved from the cookie, staff-only roles
 * are enforced here (never in the client), and the query is scoped by the
 * `from`/`to` range that the reports page sends.
 */
const DATASETS = ["registrations", "payments", "tournaments", "results", "users"] as const;
type Dataset = (typeof DATASETS)[number];

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "no rows\n";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvValue(row[header])).join(","));
  return `${lines.join("\n")}\n`;
}

function parseRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const valid = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  return {
    // Inclusive day range: [from 00:00, to 23:59:59.999]
    fromIso: valid(from) ? new Date(`${from}T00:00:00.000Z`).toISOString() : null,
    toIso: valid(to) ? new Date(`${to}T23:59:59.999Z`).toISOString() : null,
  };
}

export async function GET(request: Request): Promise<Response> {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ error: "Sign in as staff to export reports." }, { status: 401 });
  }
  if (ROLE_WEIGHT[session.roles[0] ?? "player"] < ROLE_WEIGHT.moderator || !session.isStaff) {
    return NextResponse.json({ error: "Staff permission required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const dataset = (url.searchParams.get("dataset") ?? "registrations") as Dataset;
  if (!DATASETS.includes(dataset)) {
    return NextResponse.json({ error: `Unknown dataset. Use one of: ${DATASETS.join(", ")}` }, { status: 400 });
  }

  const { fromIso, toIso } = parseRange(url.searchParams);
  const client = createAdminClient() ?? session.supabase;

  let rows: Record<string, unknown>[] = [];
  if (dataset === "registrations") {
    let query = client
      .from("tournament_registrations")
      .select("id, status, payment_status, slot_number, created_at, user:profiles(username, email), tournament:tournaments(name, slug, entry_fee)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []).map((row: Record<string, unknown>) => {
      const user = row.user as { username?: string; email?: string } | null;
      const tournament = row.tournament as { name?: string; slug?: string; entry_fee?: number } | null;
      return {
        registration_id: row.id,
        status: row.status,
        payment: row.payment_status,
        slot: row.slot_number,
        username: user?.username ?? "",
        email: user?.email ?? "",
        tournament: tournament?.name ?? "",
        tournament_slug: tournament?.slug ?? "",
        entry_fee: tournament?.entry_fee ?? 0,
        created_at: row.created_at,
      };
    });
  } else if (dataset === "payments") {
    let query = client
      .from("payment_transactions")
      .select("id, provider, provider_order_id, provider_payment_id, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (dataset === "tournaments") {
    let query = client
      .from("tournaments")
      .select("id, name, slug, status, mode, format, entry_fee, prize_pool, max_slots, starts_at, created_at")
      .order("starts_at", { ascending: false })
      .limit(5000);
    if (fromIso) query = query.gte("starts_at", fromIso);
    if (toIso) query = query.lte("starts_at", toIso);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []) as Record<string, unknown>[];
  } else if (dataset === "results") {
    let query = client
      .from("match_results")
      .select("id, placement, kills, points, is_verified, created_at, match:matches(round, match_number, map_name), team:teams(name, tag)")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []).map((row: Record<string, unknown>) => {
      const match = row.match as { round?: number; match_number?: number; map_name?: string } | null;
      const team = row.team as { name?: string; tag?: string } | null;
      return {
        result_id: row.id,
        round: match?.round ?? "",
        match_number: match?.match_number ?? "",
        map: match?.map_name ?? "",
        team: team?.name ?? "",
        team_tag: team?.tag ?? "",
        placement: row.placement,
        kills: row.kills,
        points: row.points,
        verified: row.is_verified,
        created_at: row.created_at,
      };
    });
  } else {
    let query = client
      .from("profiles")
      .select("id, username, email, country, state, is_suspended, total_earnings, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows = (data ?? []) as Record<string, unknown>[];
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rjnx-${dataset}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
