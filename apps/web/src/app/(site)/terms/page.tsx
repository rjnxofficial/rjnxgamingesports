import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "Terms of service for RJNX GAMING ESPORTS tournaments and platform use.",
};

const SECTIONS = [
  ["1. Acceptance", "By creating an RJNX account or entering a tournament you accept these terms, the fair play policy and any tournament-specific rules published on the event page."],
  ["2. Eligibility", "Players must be 13 years or older. Players under 18 need guardian consent for any paid tournament. One account per person; duplicate accounts are removed."],
  ["3. Account security", "You are responsible for your credentials. Do not share your account or device. Suspicious logins may trigger a temporary lock while our team reviews."],
  ["4. Tournament entry", "Registration is only valid once you appear as approved (or pending review) in the platform. Slot numbers are assigned in registration order and can be revoked for rule violations."],
  ["5. Entry fees and refunds", "Where entry fees apply, they are collected through a verified payment provider. A paid entry is only confirmed after server-side verification. Refunds are issued if an event is cancelled by RJNX, or if you cancel before the published deadline."],
  ["6. Prizes", "Prize pools are advertised per tournament. Payouts require identity verification and complete tournament results. RJNX may withhold a prize while a dispute or fair-play investigation is open."],
  ["7. Conduct", "Cheating, teaming, account sharing, harassment, betting on your own matches or attempting to exploit the platform results in a permanent ban and forfeiture of pending prizes."],
  ["8. Content", "By submitting clips, screenshots or recordings you grant RJNX a non-exclusive licence to use them for tournament coverage and promotion."],
  ["9. Availability", "We aim for 100% uptime but do not guarantee uninterrupted service. Maintenance windows and incidents are announced on Discord."],
  ["10. Changes", "These terms may be updated. Material changes are announced on the news page at least 7 days before taking effect."],
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Legal" title="Terms & conditions" description="Last updated: 2026" />
      <Card className="mt-6 space-y-5 p-6">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-rjnx-blue">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65">{body}</p>
          </section>
        ))}
        <p className="border-t border-white/[0.06] pt-4 text-xs text-white/40">
          Questions about these terms? Contact support@rjnxgamingesports.com.
        </p>
      </Card>
    </div>
  );
}
