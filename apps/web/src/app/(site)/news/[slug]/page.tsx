import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getArticleBySlug } from "@/server/queries";
import { formatDate } from "@rjnx/shared";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt ?? article.content.slice(0, 155),
    openGraph: { title: article.title, images: article.cover_url ? [article.cover_url] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/news" className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-rjnx-blue">
        <ArrowLeft className="size-3.5" /> All news
      </Link>

      <p className="mt-5 font-display text-[10px] uppercase tracking-[0.28em] text-rjnx-blue">
        {formatDate(article.published_at)} · {article.author?.username ?? "RJNX Staff"}
      </p>
      <h1 className="mt-2 font-display text-2xl font-black uppercase leading-tight tracking-[0.02em] text-white sm:text-3xl">
        {article.title}
      </h1>

      {article.cover_url ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-white/[0.07]">
          { }
          <img src={article.cover_url} alt="" className="w-full object-cover" />
        </div>
      ) : null}

      <Card className="mt-5 p-6">
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/75">{article.content}</div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          <Badge tone="blue">RJNX</Badge>
          <Badge tone="purple">Season 4</Badge>
          <Badge tone="neutral">Official</Badge>
        </div>
      </Card>
    </article>
  );
}
