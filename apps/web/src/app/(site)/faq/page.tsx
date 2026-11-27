import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about RJNX tournaments, registrations, room details, payments and fair play.",
};

const FAQS = [
  {
    q: "How do I register for a tournament?",
    a: "Create an account, complete your in-game name and UID on your profile, then open any tournament with registration open and press Register. Solo events register you directly; duo and squad events require a team.",
  },
  {
    q: "Where do I find the room ID and password?",
    a: "Room credentials appear on Dashboard → My matches 15 minutes before the match starts. Only players with an approved registration in that tournament can read them; the database refuses the request for everyone else.",
  },
  {
    q: "Why is my registration pending?",
    a: "Some tournaments require admin approval. A tournament manager reviews each entry for team size, completed profile and fair-play history. You get a notification the moment it is approved or rejected.",
  },
  {
    q: "How are points calculated?",
    a: "Each tournament publishes a scoring rule: placement points, kill points and optional bonuses. The leaderboard is recalculated only from verified results, and ties break on kills then best placement.",
  },
  {
    q: "Can I cancel my registration?",
    a: "Yes, until the tournament goes live. Open the tournament page and press Cancel registration, or cancel from your dashboard. Slots are released instantly for other players.",
  },
  {
    q: "What happens if I miss a match?",
    a: "No-shows forfeit after 10 minutes. Repeated no-shows can lead to suspension from future admin-approved events.",
  },
  {
    q: "Do you support payments?",
    a: "Entry-fee collection is an optional module. When it is enabled, payments are verified server-side using signed provider webhooks — a client-side success message alone never unlocks a slot.",
  },
  {
    q: "Is there an Android app?",
    a: "Yes. The RJNX Android app shares the same Supabase backend, so your registrations, teams and notifications stay in sync between web and mobile.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Knowledge base" title="Frequently asked questions" description="Everything about registering, playing and getting paid (or not) — stated plainly." />

      <div className="mt-6 space-y-3">
        {FAQS.map((item, index) => (
          <details key={item.q} className="group glass rounded-lg p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-sm font-bold uppercase tracking-[0.04em] text-white">
              <span className="flex gap-3">
                <span className="text-rjnx-blue">{String(index + 1).padStart(2, "0")}</span>
                {item.q}
              </span>
              <span className="text-rjnx-blue transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 pl-9 text-sm leading-relaxed text-white/60">{item.a}</p>
          </details>
        ))}
      </div>

      <Card id="fair-play" className="mt-8 p-6">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.14em] text-white">Fair play policy</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/60">
          <li>• No emulators, macros, aim assist tools or unauthorised clients.</li>
          <li>• No teaming with opponents in solo lobbies.</li>
          <li>• A recording is required for every top-3 finish and must be produced on request.</li>
          <li>• Abuse, threats or harassment in match chat is a bannable offence.</li>
          <li>• Accounts found sharing credentials are locked pending review.</li>
        </ul>
        <p className="mt-4 text-xs text-white/40">
          Report violations through{" "}
          <Link href="/support?category=report" className="text-rjnx-blue hover:underline">
            the support desk
          </Link>{" "}
          with evidence.
        </p>
      </Card>
    </div>
  );
}
