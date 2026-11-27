import { ShieldCheck, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { requireSuperAdmin } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeRoleAction } from "@/server/actions/admin";
import { ROLE_LABELS, ROLE_WEIGHT, type Role } from "@rjnx/shared";

export const dynamic = "force-dynamic";

const PERMISSIONS: { capability: string; roles: Role[] }[] = [
  { capability: "View admin dashboard", roles: ["super_admin", "admin", "tournament_manager", "moderator"] },
  { capability: "Create / edit tournaments", roles: ["super_admin", "admin", "tournament_manager"] },
  { capability: "Manage matches & room credentials", roles: ["super_admin", "admin", "tournament_manager"] },
  { capability: "Review registrations", roles: ["super_admin", "admin", "tournament_manager"] },
  { capability: "Verify results & recalculate boards", roles: ["super_admin", "admin", "tournament_manager"] },
  { capability: "Suspend players", roles: ["super_admin", "admin", "moderator"] },
  { capability: "Publish news, banners & broadcasts", roles: ["super_admin", "admin", "moderator"] },
  { capability: "Grant / revoke staff roles", roles: ["super_admin"] },
  { capability: "Change platform settings", roles: ["super_admin"] },
  { capability: "Review audit logs", roles: ["super_admin"] },
];

export default async function AdminRolesPage() {
  const session = await requireSuperAdmin("/admin/roles");
  const client = createAdminClient() ?? session.supabase;

  const { data } = await client
    .from("user_roles")
    .select("id, role, created_at, user:profiles(id, username, avatar_url)")
    .neq("role", "player")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    role: Role;
    created_at: string;
    user: { id: string; username: string; avatar_url: string | null } | null;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Roles & permissions"
        subtitle="Super-admin only. Every grant and revoke is written to the audit log."
      />

      <AdminPanel title="Staff members" description={`${rows.length} elevated accounts`}>
        {rows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>User</TH>
                <TH>Role</TH>
                <TH>Granted</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD className="text-white">{row.user?.username ?? "—"}</TD>
                  <TD><Badge tone={row.role === "super_admin" ? "pink" : "purple"}>{ROLE_LABELS[row.role]}</Badge></TD>
                  <TD className="text-white/45">{new Date(row.created_at).toLocaleDateString("en-IN")}</TD>
                  <TD>
                    <ActionButton
                      action={revokeRoleAction}
                      fields={{ user_id: row.user?.id ?? "", role: row.role }}
                      label="Revoke"
                      variant="danger"
                      size="sm"
                      confirm={`Revoke ${ROLE_LABELS[row.role]} from ${row.user?.username}?`}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<UserCog className="size-6" />} title="No staff roles yet" description="Grant roles from the users page." />
        )}
      </AdminPanel>

      <AdminPanel title="Promote a user" description="Grant an additional staff role by user id or username from the users page.">
        <p className="text-xs text-rjnx-muted">
          Use <strong className="text-white">Admin → Users</strong> to grant admin, tournament manager or moderator
          roles with one click. Only super admins see those buttons.
        </p>
      </AdminPanel>

      <AdminPanel title="Permission matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="px-3 py-2 text-left font-display text-[10px] uppercase tracking-[0.16em] text-white/50">Capability</th>
                {(["super_admin", "admin", "tournament_manager", "moderator"] as Role[]).map((role) => (
                  <th key={role} className="px-3 py-2 text-center font-display text-[10px] uppercase tracking-[0.14em] text-white/50">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {PERMISSIONS.map((permission) => (
                <tr key={permission.capability}>
                  <td className="px-3 py-2 text-white/75">{permission.capability}</td>
                  {(["super_admin", "admin", "tournament_manager", "moderator"] as Role[]).map((role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      {permission.roles.includes(role) ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <Card className="p-4">
        <p className="flex items-start gap-2 text-xs text-white/45">
          <ShieldCheck className="mt-0.5 size-3.5 text-emerald-400" />
          Role checks are enforced twice: in the Next.js server layer (before any mutation) and by row level
          security policies in Postgres, including on the role tables themselves.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/25">
        {Object.entries(ROLE_WEIGHT).map(([role, weight]) => (
          <span key={role} className="rounded border border-white/10 px-2 py-1">
            {role.replace(/_/g, " ")} · w{weight}
          </span>
        ))}
      </div>
    </div>
  );
}
