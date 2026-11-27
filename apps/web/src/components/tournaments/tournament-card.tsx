import Link from "next/link";
import { CalendarClock, Coins, Gamepad2, Trophy, Users } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import type { Tournament } from "@rjnx/shared";

export type TournamentCardData = Tournament & { slots?: { taken: number; approved: number } };

export function TournamentCard({ tournament, priority = false }: { tournament: TournamentCardData; priority?: boolean }) {
  const taken = tournament.slots?.taken ?? 0;
  const remaining = Math.max(0, tournament.max_slots - taken);
  const fillPercent = Math.min(100, Math.round((taken / Math.max(1, tournament.max_slots)) * 100));
  const deadline = tournament.registration_ends_at;

  return (
    <Card className="group overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:border-rjnx-blue/40 hover:shadow-[0_24px_60px_-30px_rgba(0,207,255,0.55)]">
      <Link href={`/tournaments/${tournament.slug}`} className="block">
        <div className="relative h-36 overflow-hidden border-b border-white/[0.06] bg-rjnx-surface">
          {tournament.banner_url ? (
             
            <img
              src={tournament.banner_url}
              alt=""
              loading={priority ? "eager" : "lazy"}
              className="size-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-rjnx-purple/25 via-transparent to-rjnx-blue/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-rjnx-surface via-rjnx-surface/20 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <StatusBadge status={tournament.status} />
            {tournament.is_featured ? <Badge tone="pink">Featured</Badge> : null}
          </div>
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
            <span className="font-display text-[9px] font-bold uppercase tracking-[0.22em] text-rjnx-blue">
              {tournament.game?.short_name ?? "RJNX"}
            </span>
            <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">
              {tournament.mode}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 font-display text-sm font-bold uppercase leading-snug tracking-[0.05em] text-white group-hover:text-rjnx-blue">
            {tournament.name}
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Info icon={<Trophy className="size-3 text-rjnx-pink" />} label="Prize pool" value={formatCurrency(tournament.prize_pool)} />
            <Info
              icon={<Coins className="size-3 text-rjnx-blue" />}
              label="Entry"
              value={tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : "Free"}
            />
            <Info icon={<CalendarClock className="size-3 text-rjnx-purple" />} label="Starts" value={formatDate(tournament.starts_at, false)} />
            <Info
              icon={<Gamepad2 className="size-3 text-white/50" />}
              label="Format"
              value={tournament.format.replace(/_/g, " ")}
            />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/50">
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {taken}/{tournament.max_slots} slots
              </span>
              <span className={remaining === 0 ? "text-rjnx-red" : "text-rjnx-blue"}>
                {remaining === 0 ? "Full" : `${remaining} left`}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rjnx-blue via-rjnx-purple to-rjnx-pink transition-all"
                style={{ width: `${Math.max(fillPercent, 2)}%` }}
              />
            </div>
          </div>

          {deadline ? (
            <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/40">
              Registration closes {relativeTime(deadline)}
            </p>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-white/40">{label}:</span>
      <span className="truncate font-semibold capitalize text-white/85">{value}</span>
    </div>
  );
}
