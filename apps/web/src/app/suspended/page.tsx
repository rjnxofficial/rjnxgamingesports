import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark size={64} />
      <ShieldAlert className="size-8 text-rjnx-red" />
      <h1 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-white">Account suspended</h1>
      <p className="max-w-md text-sm text-rjnx-muted">
        Your RJNX account is currently suspended. Registrations, team actions and tournaments are locked.
        Open a support ticket if you believe this is a mistake.
      </p>
      <div className="flex gap-2">
        <Link href="/support">
          <Button>Contact support</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
