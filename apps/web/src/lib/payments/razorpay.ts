import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

/** True only when the provider is configured server-side. */
export function paymentsConfigured(): boolean {
  const { razorpayKeyId, razorpayKeySecret } = serverEnv();
  return Boolean(razorpayKeyId && razorpayKeySecret);
}

/**
 * Create a Razorpay order server-side. The key secret never leaves this module.
 * Amount is sent in the smallest currency unit (paise).
 */
export async function createRazorpayOrder(input: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ ok: true; order: RazorpayOrder } | { ok: false; error: string }> {
  const { razorpayKeyId, razorpayKeySecret } = serverEnv();
  if (!razorpayKeyId || !razorpayKeySecret) {
    return { ok: false, error: "Payment provider is not configured on the server." };
  }

  const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amountInRupees * 100),
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `Razorpay order failed: ${text.slice(0, 200)}` };
  }
  return { ok: true, order: (await response.json()) as RazorpayOrder };
}

/** Verify the signature Razorpay returns to the client after checkout. */
export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean {
  const { razorpayKeySecret } = serverEnv();
  if (!razorpayKeySecret) return false;
  const expected = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}

/** Verify an incoming webhook body against the configured webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const { razorpayWebhookSecret } = serverEnv();
  if (!razorpayWebhookSecret || !signature) return false;
  const expected = crypto.createHmac("sha256", razorpayWebhookSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
