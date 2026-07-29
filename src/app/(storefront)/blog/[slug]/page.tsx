import { notFound } from "next/navigation";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { RichContent } from "@/components/RichContent";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const post = await prisma.blogPost.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });
  if (!post) notFound();
  return (
    <article className="mx-auto w-full max-w-3xl">
      {post.coverImageUrl && <div className="relative mb-8 aspect-[16/8] overflow-hidden rounded-2xl"><Image src={post.coverImageUrl} alt="" fill sizes="768px" className="object-cover" /></div>}
      <p className="text-xs tracking-widest text-ink-muted uppercase">Betolla Blog</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold text-ink">{localizedField(locale, post.titleEn, post.titleAr)}</h1>
      <RichContent html={localizedField(locale, post.contentHtmlEn, post.contentHtmlAr)} className="mt-8" />
    </article>
  );
}
