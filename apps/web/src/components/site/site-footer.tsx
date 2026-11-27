import Link from "next/link";
import { Disc3, Instagram, Mail, MessageCircle, Youtube } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { BRAND } from "@rjnx/shared";

const COLUMNS = [
  {
    title: "Compete",
    links: [
      { href: "/tournaments", label: "All tournaments" },
      { href: "/tournaments?status=live", label: "Live now" },
      { href: "/results", label: "Results" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/teams", label: "Teams" },
      { href: "/players", label: "Players" },
      { href: "/news", label: "News" },
      { href: "/leaderboard", label: "Rankings" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/support", label: "Help center" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/support?category=report", label: "Report a player" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & conditions" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/about", label: "About RJNX" },
      { href: "/faq#fair-play", label: "Fair play policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-black/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo size={40} />
            <p className="mt-4 max-w-xs text-sm text-rjnx-muted">
              India&apos;s savage-first esports arena. Weekly tournaments, verified results, and a
              leaderboard that actually means something.
            </p>
            <p className="mt-4 font-display text-[10px] font-bold uppercase tracking-[0.3em] text-rjnx-blue/80">
              {BRAND.tagline}
            </p>
            <div className="mt-5 flex gap-2">
              <Social href="https://instagram.com" label="Instagram" icon={<Instagram className="size-4" />} />
              <Social href="https://youtube.com" label="YouTube" icon={<Youtube className="size-4" />} />
              <Social href="https://discord.gg" label="Discord" icon={<Disc3 className="size-4" />} />
              <Social href="https://wa.me" label="WhatsApp" icon={<MessageCircle className="size-4" />} />
              <Social href="mailto:support@rjnxgamingesports.com" label="Email" icon={<Mail className="size-4" />} />
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                {column.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-rjnx-muted transition-colors hover:text-rjnx-blue">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-xs text-rjnx-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <p className="font-display uppercase tracking-[0.2em]">
            Developed by <span className="text-rjnx-pink">{BRAND.developer}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/60 transition-all hover:border-rjnx-blue/50 hover:text-rjnx-blue"
    >
      {icon}
    </a>
  );
}
