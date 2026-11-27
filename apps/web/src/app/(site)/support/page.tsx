import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, LifeBuoy, MessageCircle, ShieldQuestion, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { SupportForm } from "./support-form";
import { getSessionContext } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your RJNX account, registrations, room details, payments and fair play.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SupportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const session = await getSessionContext();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Help desk"
        title="Support center"
        description="Open a ticket and our tournament team responds within 24 hours. For live-match issues use the priority category."
        action={{ href: "/faq", label: "Read the FAQ" }}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
            <LifeBuoy className="size-4 text-rjnx-blue" /> Open a ticket
          </h2>
          {session ? (
            <div className="mt-4">
              <SupportForm defaultCategory={raw} />
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-white/[0.07] bg-white/[0.02] p-5 text-center">
              <p className="text-sm text-white/60">Sign in to open a support ticket so we can reply to your account.</p>
              <div className="mt-3 flex justify-center gap-2">
                <Link href="/login?next=/support">
                  <Button size="sm">Sign in</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="secondary">Create account</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <ShieldQuestion className="size-4 text-rjnx-purple" /> Common issues
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>• Room ID not visible → only approved registrations can see credentials.</li>
              <li>• Registration rejected → check team size matches the tournament format.</li>
              <li>• Result disputed → upload your screen recording link in the ticket.</li>
              <li>• Payment stuck → include your transaction reference.</li>
            </ul>
            <Link href="/faq" className="mt-3 inline-flex items-center gap-1 text-xs text-rjnx-blue hover:underline">
              <BookOpen className="size-3" /> Browse full FAQ
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
              <Smartphone className="size-4 text-rjnx-pink" /> Android app
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Push notifications for room drops, match starts and results. Built on the same RJNX backend.
            </p>
            <Link href="/contact">
              <Button variant="secondary" size="sm" className="mt-3">
                <MessageCircle className="size-3.5" /> Request APK access
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
