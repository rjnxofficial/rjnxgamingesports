import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { BannerForm } from "./banner-form";
import { requireStaff } from "@/server/auth";
import { deleteBannerAction } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const session = await requireStaff("/admin/banners");

  const { data } = await session.supabase
    .from("banners")
    .select("*")
    .order("placement")
    .order("sort_order");

  const rows = (data ?? []) as {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string;
    link_url: string | null;
    placement: string;
    is_active: boolean;
    sort_order: number;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="Banners" subtitle="Hero and strip artwork shown on the public site." />

      <AdminPanel title="New banner">
        <BannerForm />
      </AdminPanel>

      <AdminPanel title={`Banners (${rows.length})`}>
        {rows.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((banner) => (
              <div key={banner.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{banner.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {banner.placement} · order {banner.sort_order} · {banner.image_url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={banner.is_active ? "green" : "neutral"}>{banner.is_active ? "active" : "hidden"}</Badge>
                    <ActionButton action={deleteBannerAction} fields={{ id: banner.id }} label="Delete" variant="danger" size="sm" />
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-rjnx-blue">Edit</summary>
                  <div className="mt-2">
                    <BannerForm
                      defaults={{
                        id: banner.id,
                        title: banner.title,
                        subtitle: banner.subtitle ?? "",
                        image_url: banner.image_url,
                        link_url: banner.link_url ?? "",
                        placement: banner.placement,
                        is_active: banner.is_active,
                        sort_order: banner.sort_order,
                      }}
                    />
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ImageIcon className="size-6" />} title="No banners" description="Add a hero banner to style the home page." />
        )}
      </AdminPanel>
    </div>
  );
}
