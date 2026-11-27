import type { Metadata } from "next";
import { Disc3, Instagram, Mail, MessageCircle, Youtube } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { SupportForm } from "../support/support-form";
import { getSessionContext } from "@/server/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact",
  description: "Contact RJNX GAMING ESPORTS for partnerships, sponsorships, tournament support and press.",
};

const CHANNELS = [
  { icon: <Mail className="size-4" />, label: "Email", value: "support@rjnxgamingesports.com", href: "mailto:support@rjnxgamingesports.com" },
  { icon: <Instagram className="size-4" />, label: "Instagram", value: "@rjnxgamingesports", href: "https://instagram.com" },
  { icon: <Youtube className="size-4" />, label: "YouTube", value: "RJNX GAMING ESPORTS", href: "https://youtube.com" },
  { icon: <Disc3 className="size-4" />, label: "Discord", value: "rjnx community", href: "https://discord.gg" },
  { icon: <MessageCircle className="size-4" />, label: "WhatsApp", value: "Channel updates", href: "https://wa.me" },
];

export default async function ContactPage() {
  const session = await getSessionContext();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Talk to us"
        title="Contact RJNX"
        description="Sponsorships, tournament partnerships, verification requests or platform issues — pick a channel."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {CHANNELS.map((channel) => (
            <a key={channel.label} href={channel.href} target="_blank" rel="noreferrer noopener">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:border-rjnx-blue/35">
                <span className="rounded-md border border-white/10 bg-white/5 p-2 text-rjnx-blue">{channel.icon}</span>
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.2em] text-white/40">{channel.label}</p>
                  <p className="text-sm font-semibold text-white">{channel.value}</p>
                </div>
              </Card>
            </a>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="font-display text-sm font-black uppercase tracking-[0.14em] text-white">Send a message</h2>
          <p className="mt-1 text-xs text-white/45">
            Messages are routed to the support desk and answered within 24 hours.
          </p>
          <div className="mt-4">
            {session ? (
              <SupportForm />
            ) : (
              <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-5 text-center">
                <p className="text-sm text-white/60">Sign in to send a tracked message.</p>
                <Link href="/login?next=/contact" className="mt-3 inline-block text-xs text-rjnx-blue hover:underline">
                  Sign in →
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
