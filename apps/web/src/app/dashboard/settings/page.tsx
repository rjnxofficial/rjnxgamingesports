import Link from "next/link";
import { BellRing, KeyRound, LogOut, ShieldAlert, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { signOutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireUser("/dashboard/settings");

  const { data: pushTokens } = await session.supabase
    .from("push_tokens")
    .select("id, platform, created_at, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Settings" subtitle="Security, sessions and notification channels." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <KeyRound className="size-4 text-rjnx-blue" /> Security
          </h2>
          <dl className="mt-3 space-y-2 text-xs">
            <Row label="Email" value={session.user.email ?? "—"} />
            <Row label="Email verified" value={session.user.email_confirmed_at ? formatDate(session.user.email_confirmed_at) : "Not verified"} />
            <Row label="Last sign in" value={formatDate(session.user.last_sign_in_at)} />
            <Row label="Account ID" value={session.user.id.slice(0, 8) + "…"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/forgot-password">
              <Button variant="secondary" size="sm">Change password</Button>
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="danger" size="sm">
                <LogOut className="size-3.5" /> Sign out everywhere
              </Button>
            </form>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <BellRing className="size-4 text-rjnx-pink" /> Notification channels
          </h2>
          <div className="mt-3 space-y-2 text-xs text-white/60">
            <p className="flex items-center justify-between rounded-md bg-white/[0.02] px-3 py-2">
              <span>Website inbox</span>
              <Badge tone="green">Always on</Badge>
            </p>
            <p className="flex items-center justify-between rounded-md bg-white/[0.02] px-3 py-2">
              <span>Android push</span>
              <Badge tone={pushTokens?.length ? "green" : "neutral"}>
                {pushTokens?.length ? `${pushTokens.length} device${pushTokens.length === 1 ? "" : "s"}` : "Not linked"}
              </Badge>
            </p>
            <p className="flex items-center justify-between rounded-md bg-white/[0.02] px-3 py-2">
              <span>Email alerts</span>
              <Badge tone="blue">Auth emails only</Badge>
            </p>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[11px] text-white/35">
            <Smartphone className="mt-0.5 size-3.5" /> Install the RJNX Android app and sign in — your device registers
            automatically for room, match and result alerts.
          </p>
        </Card>
      </div>

      <Card className="border-rjnx-red/25 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-rjnx-red">
          <ShieldAlert className="size-4" /> Account deletion
        </h2>
        <p className="mt-2 max-w-2xl text-xs text-white/45">
          Account deletion is handled by the RJNX support team so we can preserve tournament integrity records.
          Open a ticket with the category &quot;account&quot; and an admin will process your request within 7 days.
        </p>
        <Link href="/dashboard/support">
          <Button variant="secondary" size="sm" className="mt-3">Request account deletion</Button>
        </Link>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.02] px-3 py-2">
      <dt className="text-white/40">{label}</dt>
      <dd className="truncate font-semibold text-white/85">{value}</dd>
    </div>
  );
}
