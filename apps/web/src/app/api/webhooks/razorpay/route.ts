import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver.
 * - Signature is verified against the raw body before anything is written.
 * - Handles payment.captured and payment.failed idempotently.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role not configured" }, { status: 500 });

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;
  const eventName = event.event ?? "";

  if (!orderId) return NextResponse.json({ ok: true, ignored: true });

  const nextStatus =
    eventName === "payment.captured" ? "paid" : eventName === "payment.failed" ? "failed" : eventName === "refund.processed" ? "refunded" : null;

  if (!nextStatus) return NextResponse.json({ ok: true, ignored: true });

  const { data: transaction } = await admin
    .from("payment_transactions")
    .select("id, registration_id, status, user_id")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  if (!transaction) return NextResponse.json({ ok: true, ignored: true });
  if (transaction.status === nextStatus) return NextResponse.json({ ok: true, duplicate: true });

  await admin
    .from("payment_transactions")
    .update({ status: nextStatus, provider_payment_id: paymentId ?? null })
    .eq("id", transaction.id);

  if (transaction.registration_id) {
    await admin
      .from("tournament_registrations")
      .update({ payment_status: nextStatus === "paid" ? "paid" : nextStatus === "refunded" ? "refunded" : "failed" })
      .eq("id", transaction.registration_id);

    if (nextStatus === "paid") {
      const { data: registration } = await admin
        .from("tournament_registrations")
        .select("user_id")
        .eq("id", transaction.registration_id)
        .maybeSingle();
      const userId = registration?.user_id ?? transaction.user_id;
      if (userId) {
        await admin.from("notifications").insert({
          user_id: userId,
          type: "payment",
          title: "Entry fee received",
          body: "Your tournament slot is confirmed. Room details arrive before the match.",
          link: "/dashboard/tournaments",
        });
      }
    }
  }

  await admin.from("audit_logs").insert({
    actor_id: null,
    action: `payment.webhook.${eventName}`,
    entity_type: "payment_transaction",
    entity_id: transaction.id,
    metadata: { payment_id: paymentId ?? null, amount: entity?.amount ?? null },
  });

  return NextResponse.json({ ok: true });
}
