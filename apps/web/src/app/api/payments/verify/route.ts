import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsConfigured, verifyPaymentSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(8),
});

/**
 * Verifies a checkout result server-side. A client-reported "success" is never
 * trusted: the HMAC signature must validate before a registration is unlocked.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!paymentsConfigured()) return NextResponse.json({ error: "Payments are not enabled" }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const valid = verifyPaymentSignature({
    orderId: parsed.data.razorpay_order_id,
    paymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
  });
  if (!valid) return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server not configured for verification" }, { status: 500 });

  const { data: transaction } = await admin
    .from("payment_transactions")
    .select("id, user_id, registration_id")
    .eq("provider_order_id", parsed.data.razorpay_order_id)
    .maybeSingle();

  if (!transaction || transaction.user_id !== session.user.id) {
    return NextResponse.json({ error: "Order not found for this account" }, { status: 404 });
  }

  await admin
    .from("payment_transactions")
    .update({ status: "paid", provider_payment_id: parsed.data.razorpay_payment_id })
    .eq("id", transaction.id);

  if (transaction.registration_id) {
    await admin
      .from("tournament_registrations")
      .update({ payment_status: "paid" })
      .eq("id", transaction.registration_id);
  }

  await admin.from("audit_logs").insert({
    actor_id: session.user.id,
    action: "payment.verified",
    entity_type: "payment_transaction",
    entity_id: transaction.id,
    metadata: { payment_id: parsed.data.razorpay_payment_id },
  });

  return NextResponse.json({ ok: true });
}
