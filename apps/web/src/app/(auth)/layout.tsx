import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { BRAND } from "@rjnx/shared";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="scanline pointer-events-none fixed inset-0 z-0 opacity-40" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <Link
          href="/tournaments"
          className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-rjnx-blue"
        >
          Browse events
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">{children}</main>
      <footer className="relative z-10 px-5 py-5 text-center text-[10px] uppercase tracking-[0.28em] text-white/30">
        {BRAND.name} · {BRAND.tagline}
      </footer>
    </div>
  );
}
