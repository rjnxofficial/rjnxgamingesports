import { NextResponse, type NextRequest } from "next/server";
import { registrationSchema } from "@rjnx/shared";
import { getSessionContext } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRazorpayOrder, paymentsConfigured } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a provider order for a tournament entry fee.
 * The amount always comes from the database, never from the client payload.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!paymentsConfigured()) {
    return NextResponse.json({ error: "Payments are not enabled" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: tournament } = await session.supabase
    .from("tournaments")
    .select("id, name, entry_fee, status")
    .eq("id", parsed.data.tournament_id)
    .maybeSingle();

  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  if (Number(tournament.entry_fee) <= 0) {
    return NextResponse.json({ error: "This tournament has no entry fee" }, { status: 400 });
  }

  const { data: existing } = await session.supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournament.id)
    .eq("user_id", session.user.id)
    .in("status", ["pending", "approved", "waitlisted"])
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Register for the tournament first" }, { status: 409 });
  }

  const order = await createRazorpayOrder({
    amountInRupees: Number(tournament.entry_fee),
    receipt: `reg_${existing.id.slice(0, 8)}`,
    notes: { tournament_id: tournament.id, user_id: session.user.id, registration_id: existing.id },
  });

  if (!order.ok) return NextResponse.json({ error: order.error }, { status: 502 });

  const admin = createAdminClient() ?? session.supabase;
  await admin.from("payment_transactions").insert({
    user_id: session.user.id,
    tournament_id: tournament.id,
    registration_id: existing.id,
    provider: "razorpay",
    provider_order_id: order.order.id,
    amount: Number(tournament.entry_fee),
    currency: "INR",
    status: "created",
    receipt: order.order.receipt ?? null,
  });

  return NextResponse.json({
    orderId: order.order.id,
    amount: order.order.amount,
    currency: order.order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
