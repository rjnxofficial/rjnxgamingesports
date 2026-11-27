import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { requireSuperAdmin } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const action = (Array.isArray(params.action) ? params.action[0] : params.action) ?? "";
  const session = await requireSuperAdmin("/admin/audit");

  let query = session.supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, actor:profiles(username)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (action) query = query.ilike("action", `%${action}%`);

  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    actor: { username: string } | null;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="Audit logs" subtitle="Immutable record of privileged actions. Super-admin only." />

      <form action="/admin/audit" className="flex flex-wrap gap-2">
        <input
          name="action"
          defaultValue={action}
          placeholder="Filter action (e.g. role.grant)"
          className="h-9 w-64 rounded-md border border-white/10 bg-black/40 px-3 text-xs text-white"
        />
        <button type="submit" className="h-9 rounded-md border border-white/10 px-3 font-display text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-rjnx-blue/40 hover:text-white">
          Filter
        </button>
      </form>

      <AdminPanel title={`${rows.length} entries`}>
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Actor</TH>
                <TH>Metadata</TH>
                <TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="font-mono text-[11px] text-white/85">{row.action}</TD>
                  <TD className="text-white/55">
                    {row.entity_type}
                    {row.entity_id ? <span className="text-white/25"> · {row.entity_id.slice(0, 8)}</span> : null}
                  </TD>
                  <TD><Badge tone="purple">{row.actor?.username ?? "system"}</Badge></TD>
                  <TD className="max-w-64 truncate font-mono text-[10px] text-white/40">
                    {row.metadata ? JSON.stringify(row.metadata) : "—"}
                  </TD>
                  <TD className="text-white/40">{formatDate(row.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Activity className="size-6" />} title="No audit entries" description="Privileged actions are recorded here automatically." />
        )}
      </AdminPanel>
    </div>
  );
}
