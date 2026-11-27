import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { TournamentForm } from "@/components/admin/tournament-form";
import { requireStaff } from "@/server/auth";
import { getGames } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage() {
  const session = await requireStaff("/admin/tournaments/new");
  const [games, { data: rules }] = await Promise.all([
    getGames(),
    session.supabase.from("scoring_rules").select("id, name, is_default").order("is_default", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="New tournament"
        subtitle="Configure the event, slots, schedule and scoring before publishing."
      />
      <AdminPanel title="Tournament details">
        <TournamentForm
          games={games.map((game) => ({ id: game.id, name: game.name }))}
          scoringRules={(rules ?? []) as { id: string; name: string; is_default: boolean }[]}
        />
      </AdminPanel>
    </div>
  );
}
