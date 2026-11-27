import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How RJNX GAMING ESPORTS collects, uses and protects your data.",
};

const SECTIONS = [
  ["What we collect", "Account data (email, username, hashed password managed by Supabase Auth), profile details you provide (name, phone, country, state, in-game name and UID), tournament activity, team memberships, match results and support tickets."],
  ["Why we collect it", "To authenticate you, verify tournament eligibility, keep brackets fair, publish verified leaderboards, send tournament notifications and respond to support tickets."],
  ["Legal basis", "We process data to perform our contract with you (running your account and tournaments), with your consent (marketing communications) and for legitimate interests (fair play and fraud prevention)."],
  ["Room credentials", "Room IDs and passwords are stored server-side and served only to approved participants of the relevant match through a security-definer database function. They are never included in public pages or APIs."],
  ["Sharing", "We do not sell personal data. Data is stored with Supabase (database, auth, storage). Public pages display your username, avatar, country and tournament statistics only."],
  ["Your rights", "You can update most profile fields yourself, request a data export or account deletion through the support desk. Requests are actioned within 7 days, excluding records we must retain for tournament integrity."],
  ["Security", "Row level security is enabled on every table, privileged keys never reach the browser, sessions are refreshed and validated on the server, and sensitive actions are audit logged."],
  ["Children", "Accounts under 13 are not permitted. Any account found to belong to a child under 13 is removed."],
  ["Cookies", "We use strictly necessary authentication cookies. No advertising or cross-site tracking cookies are set by the platform."],
  ["Contact", "Privacy questions and requests: support@rjnxgamingesports.com."],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Legal" title="Privacy policy" description="Last updated: 2026" />
      <Card className="mt-6 space-y-5 p-6">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-rjnx-blue">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65">{body}</p>
          </section>
        ))}
      </Card>
    </div>
  );
}
