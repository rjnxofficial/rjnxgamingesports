import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { SectionHeading } from "@/components/site/section-heading";
import { listNews } from "@/server/queries";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "News & announcements",
  description: "RJNX announcements, tournament launches, rule updates and community news.",
};

export default async function NewsPage() {
  const articles = await listNews(24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading eyebrow="Newsroom" title="News & announcements" description="Platform updates, circuit announcements and fair-play bulletins." />

      {articles.length ? (
        <div className="mt-6 space-y-4">
          {articles.map((article, index) => (
            <Link key={article.id} href={`/news/${article.slug}`}>
              <Card className={`group overflow-hidden p-0 transition-colors hover:border-rjnx-blue/35 ${index === 0 ? "" : ""}`}>
                <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div className="relative h-36 overflow-hidden border-b border-white/[0.06] sm:h-full sm:border-b-0 sm:border-r">
                    {article.cover_url ? (
                       
                      <img src={article.cover_url} alt="" className="size-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-rjnx-purple/25 to-rjnx-blue/15" />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-rjnx-blue">
                      {formatDate(article.published_at, false)} · {article.author?.username ?? "RJNX Staff"}
                    </p>
                    <h2 className="mt-1.5 font-display text-base font-black uppercase tracking-[0.04em] text-white group-hover:text-rjnx-blue">
                      {article.title}
                    </h2>
                    {article.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-white/55">{article.excerpt}</p> : null}
                    <span className="mt-3 inline-block font-display text-[10px] uppercase tracking-[0.2em] text-rjnx-pink">
                      Read article →
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-6" icon={<Newspaper className="size-6" />} title="No announcements yet" description="News is published from the admin command center." />
      )}
    </div>
  );
}
