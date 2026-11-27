"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Real Razorpay checkout for a paid tournament entry.
 *
 * Flow: server creates the order (amount comes from the database) → checkout
 * collects the payment → the server verifies the HMAC signature before the
 * registration is marked paid. Nothing is trusted from the browser.
 */
export function PayEntryButton({
  tournamentId,
  tournamentName,
  amount,
  playerName,
  playerEmail,
  onPaid,
}: {
  tournamentId: string;
  tournamentName: string;
  amount: number;
  playerName: string;
  playerEmail: string;
  onPaid?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      const orderResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tournament_id: tournamentId }),
      });
      const order = (await orderResponse.json()) as {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        error?: string;
      };

      if (!orderResponse.ok || !order.orderId || !order.keyId) {
        toast.error(order.error ?? "Could not start the payment. Try again.");
        return;
      }

      const ready = await loadCheckout();
      if (!ready || !window.Razorpay) {
        toast.error("Payment window failed to load. Check your connection and retry.");
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency ?? "INR",
        name: "RJNX GAMING ESPORTS",
        description: `${tournamentName} entry fee`,
        prefill: { name: playerName, email: playerEmail },
        theme: { color: "#00CFFF" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast.message("Payment cancelled. Your slot stays reserved until the deadline.");
          },
        },
        handler: async (response: RazorpayResponse) => {
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(response),
          });
          const verified = (await verifyResponse.json()) as { ok?: boolean; error?: string };
          if (verifyResponse.ok && verified.ok !== false) {
            toast.success("Payment confirmed. Your slot is locked in.");
            onPaid?.();
            router.refresh();
          } else {
            toast.error(verified.error ?? "We could not verify the payment. Contact support.");
          }
          setBusy(false);
        },
      });

      checkout.open();
    } catch {
      toast.error("Payment failed to start. Try again.");
      setBusy(false);
    }
  };

  return (
    <Button className="w-full" size="lg" onClick={() => void pay()} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
      Pay entry fee · ₹{amount}
    </Button>
  );
}
