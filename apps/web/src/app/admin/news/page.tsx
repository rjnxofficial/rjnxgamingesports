import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-shell";
import { ActionButton } from "@/components/dashboard/action-form";
import { NewsForm } from "./news-form";
import { requireStaff } from "@/server/auth";
import { deleteNewsAction } from "@/server/actions/admin";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const session = await requireStaff("/admin/news");

  const { data } = await session.supabase
    .from("news_articles")
    .select("id, slug, title, excerpt, content, cover_url, is_published, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    cover_url: string | null;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
  }[];

  return (
    <div className="space-y-6">
      <AdminHeader title="News & announcements" subtitle="Publish platform updates to the public news feed." />

      <AdminPanel title="New article">
        <NewsForm />
      </AdminPanel>

      <AdminPanel title={`Articles (${rows.length})`}>
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((article) => (
              <div key={article.id} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{article.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                      /{article.slug} · {article.published_at ? formatDate(article.published_at) : "draft"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={article.is_published ? "green" : "amber"}>{article.is_published ? "published" : "draft"}</Badge>
                    <ActionButton action={deleteNewsAction} fields={{ id: article.id }} label="Delete" variant="danger" size="sm" confirm="Delete this article?" />
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-rjnx-blue">Edit / publish</summary>
                  <div className="mt-2">
                    <NewsForm
                      defaults={{
                        id: article.id,
                        title: article.title,
                        slug: article.slug,
                        excerpt: article.excerpt ?? "",
                        content: article.content,
                        cover_url: article.cover_url ?? "",
                        is_published: article.is_published,
                      }}
                    />
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FileText className="size-6" />} title="No articles" description="Publish your first announcement above." />
        )}
      </AdminPanel>
    </div>
  );
}
