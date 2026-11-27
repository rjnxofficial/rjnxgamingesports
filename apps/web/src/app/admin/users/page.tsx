import Link from "next/link";
import { ShieldAlert, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { requireStaff } from "@/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantRoleAction, revokeRoleAction, suspendUserAction } from "@/server/actions/admin";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const search = first(params.q);
  const filter = first(params.filter) || "all";
  const session = await requireStaff("/admin/users");

  const client = createAdminClient() ?? session.supabase;
  let query = client
    .from("profiles")
    .select("id, username, full_name, email, country, state, in_game_name, avatar_url, is_suspended, created_at, user_roles(role)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
  if (filter === "suspended") query = query.eq("is_suspended", true);

  const { data } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    username: string;
    full_name: string | null;
    email: string | null;
    country: string | null;
    state: string | null;
    in_game_name: string | null;
    is_suspended: boolean;
    created_at: string;
    user_roles: { role: string }[];
  }[];

  const staffRows = filter === "staff" ? rows.filter((row) => row.user_roles.some((role) => role.role !== "player")) : rows;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Users"
        subtitle={`${staffRows.length} accounts listed. Super admins manage roles and suspensions.`}
      />

      <form className="flex flex-wrap items-end gap-2" action="/admin/users">
        <Input name="q" defaultValue={search} placeholder="Search username or name" className="max-w-64" aria-label="Search users" />
        <Select name="filter" defaultValue={filter} aria-label="Filter users" className="max-w-40">
          <option value="all">All users</option>
          <option value="suspended">Suspended</option>
          <option value="staff">Staff only</option>
        </Select>
        <Button type="submit" size="sm" variant="secondary">Filter</Button>
      </form>

      <AdminPanel title="Accounts" description="Role changes and suspensions are super-admin capabilities and are audit logged.">
        {staffRows.length ? (
          <Table>
            <THead>
              <TR>
                <TH>Player</TH>
                <TH>Location</TH>
                <TH>Roles</TH>
                <TH>Joined</TH>
                <TH>State</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {staffRows.map((row) => {
                const roles = row.user_roles?.map((role) => role.role) ?? ["player"];
                return (
                  <TR key={row.id}>
                    <TD>
                      <Link href={`/players/${row.username}`} className="text-xs font-semibold text-white hover:text-rjnx-blue">
                        {row.username}
                      </Link>
                      <p className="text-[10px] text-white/30">{row.full_name ?? row.email ?? "—"}</p>
                    </TD>
                    <TD className="text-white/55">{[row.state, row.country].filter(Boolean).join(", ") || "—"}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {roles.map((role) => (
                          <Badge key={role} tone={role === "super_admin" ? "pink" : role === "player" ? "neutral" : "purple"}>
                            {role.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </TD>
                    <TD className="text-white/45">{formatDate(row.created_at, false)}</TD>
                    <TD>
                      <Badge tone={row.is_suspended ? "red" : "green"}>{row.is_suspended ? "suspended" : "active"}</Badge>
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1">
                        {session.isSuperAdmin ? (
                          <ActionButton
                            action={suspendUserAction}
                            fields={{ user_id: row.id, suspend: row.is_suspended ? "false" : "true", reason: "Policy violation" }}
                            label={row.is_suspended ? "Reinstate" : "Suspend"}
                            variant={row.is_suspended ? "success" : "danger"}
                            size="sm"
                            confirm={row.is_suspended ? undefined : "Suspend this account?"}
                          />
                        ) : (
                          <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">View only</span>
                        )}
                        {session.isSuperAdmin && !roles.includes("admin") ? (
                          <ActionButton action={grantRoleAction} fields={{ user_id: row.id, role: "admin" }} label="+ admin" variant="ghost" size="sm" />
                        ) : null}
                        {session.isSuperAdmin && !roles.includes("tournament_manager") ? (
                          <ActionButton action={grantRoleAction} fields={{ user_id: row.id, role: "tournament_manager" }} label="+ TM" variant="ghost" size="sm" />
                        ) : null}
                        {session.isSuperAdmin && !roles.includes("moderator") ? (
                          <ActionButton action={grantRoleAction} fields={{ user_id: row.id, role: "moderator" }} label="+ mod" variant="ghost" size="sm" />
                        ) : null}
                        {session.isSuperAdmin && roles.includes("admin") ? (
                          <ActionButton action={revokeRoleAction} fields={{ user_id: row.id, role: "admin" }} label="− admin" variant="danger" size="sm" />
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState icon={<Users className="size-6" />} title="No users match" description="Adjust the search or filter." />
        )}
      </AdminPanel>

      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/30">
        <span className="flex items-center gap-1"><UserCheck className="size-3" /> Every suspension is audit logged</span>
        <span className="flex items-center gap-1"><ShieldAlert className="size-3" /> Self-suspension and last-super-admin removal are blocked</span>
      </div>
    </div>
  );
}
