"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[rjnx] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.4em] text-rjnx-red">System fault</p>
      <h1 className="font-display text-2xl font-black uppercase text-white">Something broke in the arena</h1>
      <p className="max-w-md text-sm text-rjnx-muted">
        We logged the fault. Retry the action — if it keeps happening, open a support ticket.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Retry</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/support")}>
          Contact support
        </Button>
      </div>
    </div>
  );
}
