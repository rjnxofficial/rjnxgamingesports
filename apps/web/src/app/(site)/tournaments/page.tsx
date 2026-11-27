import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Search, SlidersHorizontal, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/table";
import { FilterTabs } from "@/components/ui/tabs";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { getGames, listTournaments } from "@/server/queries";
import { MODES, formatNumber } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Browse every RJNX tournament — upcoming, live and completed events across Free Fire, BGMI, Valorant, COD Mobile and more.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Live", value: "live" },
  { label: "Registration open", value: "registration_open" },
  { label: "Completed", value: "completed" },
];

export default async function TournamentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = first(params.status) || "all";
  const game = first(params.game) || "all";
  const mode = first(params.mode) || "all";
  const search = first(params.q);
  const order = (first(params.order) || (status === "completed" ? "starts_desc" : "starts_asc")) as
    | "starts_asc"
    | "starts_desc"
    | "created_desc";
  const page = Math.max(1, Number(first(params.page) || 1));

  const [games, result] = await Promise.all([
    getGames(),
    listTournaments({ status, game, mode, search, order, page, limit: 12 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.32em] text-rjnx-blue">Compete</p>
          <h1 className="mt-1.5 font-display text-3xl font-black uppercase tracking-[0.04em] text-white">
            Tournaments
          </h1>
          <p className="mt-2 max-w-xl text-sm text-rjnx-muted">
            {formatNumber(result.count)} events listed. Filter by title, format or status and lock in your slot.
          </p>
        </div>
        <Link href="/dashboard/teams">
          <Button variant="secondary" shape="hud">
            <Swords className="size-4" /> Build your squad
          </Button>
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <FilterTabs items={STATUS_TABS} param="status" basePath="/tournaments" />

        <Card className="p-3">
          <form className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/tournaments">
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
              <Input name="q" defaultValue={search} placeholder="Search tournaments" className="pl-8" aria-label="Search tournaments" />
            </div>
            <Select name="game" defaultValue={game} aria-label="Filter by game">
              <option value="all">All games</option>
              {games.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </Select>
            <Select name="mode" defaultValue={mode} aria-label="Filter by mode">
              <option value="all">All formats</option>
              {MODES.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </Select>
            <Select name="order" defaultValue={order} aria-label="Sort order">
              <option value="starts_asc">Starting soonest</option>
              <option value="starts_desc">Most recent</option>
              <option value="created_desc">Newly added</option>
            </Select>
            <Button type="submit" className="h-10">
              <SlidersHorizontal className="size-4" /> Filter
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        {result.rows.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.rows.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} priority={index < 3} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="size-6" />}
            title="No tournaments match those filters"
            description="Try a different title or clear the filters. New events are published every week."
            action={
              <Link href="/tournaments">
                <Button variant="secondary" size="sm">
                  Clear filters
                </Button>
              </Link>
            }
          />
        )}
      </div>

      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }).map((_, index) => {
            const pageNumber = index + 1;
            const query = new URLSearchParams();
            if (status !== "all") query.set("status", status);
            if (game !== "all") query.set("game", game);
            if (mode !== "all") query.set("mode", mode);
            if (search) query.set("q", search);
            if (order) query.set("order", order);
            query.set("page", String(pageNumber));
            return (
              <Link
                key={pageNumber}
                href={`/tournaments?${query.toString()}`}
                aria-current={pageNumber === page ? "page" : undefined}
                className={`flex size-8 items-center justify-center rounded border font-display text-[11px] font-bold ${
                  pageNumber === page
                    ? "border-rjnx-blue/50 bg-rjnx-blue/15 text-white"
                    : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {pageNumber}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
