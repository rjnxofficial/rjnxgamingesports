import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { SettingForm } from "./setting-form";
import { requireSuperAdmin } from "@/server/auth";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireSuperAdmin("/admin/settings");

  const { data } = await session.supabase
    .from("platform_settings")
    .select("key, value, description, updated_at")
    .order("key");

  const rows = (data ?? []) as { key: string; value: unknown; description: string | null; updated_at: string }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="Platform settings" subtitle="Super-admin only. Values are stored as JSONB and read by the live site." />

      <AdminPanel title={`${rows.length} settings`} description="Edit any value, or add a new key.">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-white">{row.key}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                    {row.description ?? "no description"} · updated {formatDate(row.updated_at)}
                  </p>
                </div>
                <code className="max-w-full truncate rounded bg-black/40 px-2 py-1 text-[11px] text-rjnx-blue">
                  {JSON.stringify(row.value)}
                </code>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-rjnx-blue">Edit</summary>
                <div className="mt-2">
                  <SettingForm
                    defaults={{
                      key: row.key,
                      value: typeof row.value === "string" ? row.value : JSON.stringify(row.value),
                      description: row.description ?? "",
                    }}
                  />
                </div>
              </details>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Add setting">
        <SettingForm />
      </AdminPanel>

      <Card className="p-4">
        <p className="flex items-start gap-2 text-xs text-white/45">
          <Settings className="mt-0.5 size-3.5 text-rjnx-blue" />
          Turning off <code className="mx-1 rounded bg-white/10 px-1 font-mono text-[11px]">seed_demo_data</code> prevents demo
          tournaments from being recreated by a future seed run. Payments stay disabled until provider credentials and
          compliance review are complete.
        </p>
      </Card>
    </div>
  );
}
