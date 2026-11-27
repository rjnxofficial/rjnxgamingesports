import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { ProfileForms } from "./profile-forms";
import { requireUser } from "@/server/auth";
import { getGames } from "@/server/queries";
import { formatCurrency } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireUser("/dashboard/profile");
  const games = await getGames();

  const [{ data: statsRaw }, { data: achievements }] = await Promise.all([
    session.supabase.rpc("player_stats", { p_user_id: session.user.id }),
    session.supabase
      .from("leaderboard_entries")
      .select("rank, total_points, total_kills, tournament:tournaments(name, slug)")
      .eq("user_id", session.user.id)
      .lte("rank", 3)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const stats = (statsRaw ?? {}) as {
    tournaments_played?: number;
    wins?: number;
    total_kills?: number;
    total_earnings?: number;
    global_rank?: number | null;
  };

  const profile = session.profile;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity"
        title="Player profile"
        subtitle="Everything tournament admins see when they review your registration."
        actions={
          profile ? (
            <Link href={`/players/${profile.username}`} className="inline-flex items-center gap-1 text-xs text-rjnx-blue hover:underline">
              View public page <ExternalLink className="size-3" />
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Tournaments" value={String(stats.tournaments_played ?? 0)} />
        <MiniStat label="Wins" value={String(stats.wins ?? 0)} />
        <MiniStat label="Kills" value={String(stats.total_kills ?? 0)} />
        <MiniStat label="Earnings" value={formatCurrency(stats.total_earnings ?? 0)} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Profile details</h2>
        <div className="mt-4">
          <ProfileForms
            games={games.map((game) => ({ id: game.id, name: game.name }))}
            profile={{
              username: profile?.username ?? "",
              full_name: profile?.full_name ?? "",
              phone: profile?.phone ?? "",
              country: profile?.country ?? "",
              state: profile?.state ?? "",
              bio: profile?.bio ?? "",
              in_game_name: profile?.in_game_name ?? "",
              game_uid: profile?.game_uid ?? "",
              primary_game_id: profile?.primary_game_id ?? "",
              avatar_url: profile?.avatar_url ?? null,
            }}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
          <Trophy className="size-4 text-amber-300" /> Achievements
        </h2>
        {achievements?.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(achievements as unknown as {
              rank: number;
              total_points: number;
              total_kills: number;
              tournament: { name: string; slug: string } | null;
            }[]).map((row, index) => (
              <li key={index} className="rounded-md border border-amber-400/25 bg-amber-400/[0.06] p-3">
                <p className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.18em] text-amber-300">
                  <Trophy className="size-3" /> #{row.rank} finish
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{row.tournament?.name}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                  {row.total_points} pts · {row.total_kills} kills
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-rjnx-muted">
            Top-3 finishes unlock achievement badges here. Your first podium is waiting.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-white">Account</h2>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <Row label="Email" value={session.user.email ?? "—"} />
          <Row label="Email verified" value={session.user.email_confirmed_at ? "Yes" : "Pending"} />
          <Row label="Member since" value={new Date(session.user.created_at).toLocaleDateString("en-IN")} />
          <Row label="Roles" value={session.roles.join(", ")} />
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {session.roles.map((role) => (
            <Badge key={role} tone={role === "super_admin" ? "pink" : role === "player" ? "neutral" : "purple"}>
              {role.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</p>
      <p className="mt-0.5 font-display text-lg font-black text-white">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-md bg-white/[0.02] px-3 py-2">
      <dt className="text-white/40">{label}</dt>
      <dd className="truncate font-semibold text-white/85">{value}</dd>
    </div>
  );
}
