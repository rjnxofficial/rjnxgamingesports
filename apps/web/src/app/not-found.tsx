import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark size={72} />
      <div>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.4em] text-rjnx-pink">404</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-[0.1em] text-white">
          Sector not found
        </h1>
        <p className="mt-2 max-w-md text-sm text-rjnx-muted">
          This arena does not exist, or the tournament has been moved. Head back to the lobby.
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/">
          <Button>Back to home</Button>
        </Link>
        <Link href="/tournaments">
          <Button variant="secondary">Browse tournaments</Button>
        </Link>
      </div>
    </div>
  );
}
