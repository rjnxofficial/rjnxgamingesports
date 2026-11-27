import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { FilterTabs } from "@/components/ui/tabs";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { requireStaff } from "@/server/auth";
import { reviewRegistrationAction } from "@/server/actions/admin";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = raw ?? "pending";
  const session = await requireStaff("/admin/registrations");

  let query = session.supabase
    .from("tournament_registrations")
    .select(
      "id, status, slot_number, payment_status, notes, created_at, reviewed_at, team:teams(name, tag), profile:profiles(username, in_game_name, game_uid), tournament:tournaments(id, name, slug, mode)",
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    status: string;
    slot_number: number | null;
    payment_status: string;
    notes: string | null;
    created_at: string;
    reviewed_at: string | null;
    team: { name: string; tag: string | null } | null;
    profile: { username: string; in_game_name: string | null; game_uid: string | null } | null;
    tournament: { id: string; name: string; slug: string; mode: string } | null;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="Registrations" subtitle="Review entries, approve teams and manage waitlists." />
      <FilterTabs items={TABS} param="status" basePath="/admin/registrations" />

      <AdminPanel title={`${status} registrations`} description={`${rows.length} entries`}>
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Player / team</TH>
                <TH>Tournament</TH>
                <TH>Slot</TH>
                <TH>Payment</TH>
                <TH>Submitted</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <p className="text-xs font-semibold text-white">{row.team?.name ?? row.profile?.username ?? "—"}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                      {row.profile?.username ?? ""} {row.profile?.in_game_name ? `· ${row.profile.in_game_name}` : ""}
                    </p>
                  </TD>
                  <TD>
                    <Link href={`/admin/tournaments/${row.tournament?.id}`} className="text-xs text-white/80 hover:text-rjnx-blue">
                      {row.tournament?.name}
                    </Link>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">{row.tournament?.mode}</p>
                  </TD>
                  <TD className="text-white/60">{row.slot_number ?? "—"}</TD>
                  <TD><StatusBadge status={row.payment_status} /></TD>
                  <TD className="text-white/50">{formatDate(row.created_at, false)}</TD>
                  <TD>
                    <StatusBadge status={row.status} />
                    {row.notes ? <p className="mt-1 max-w-40 truncate text-[10px] text-white/30">{row.notes}</p> : null}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "approved" }} label="Approve" variant="success" size="sm" />
                      <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "waitlisted" }} label="Waitlist" variant="ghost" size="sm" />
                      <ActionButton action={reviewRegistrationAction} fields={{ registration_id: row.id, status: "rejected" }} label="Reject" variant="danger" size="sm" />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<ListChecks className="size-6" />} title={`No ${status} registrations`} description="New entries land here the moment players register." />
        )}
      </AdminPanel>

      <p className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
        <Badge tone="blue">Slot limits enforced by database transaction</Badge>
        <Badge tone="purple">Players are notified on every review</Badge>
      </p>
    </div>
  );
}
