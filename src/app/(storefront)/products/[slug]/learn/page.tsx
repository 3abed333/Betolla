import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { RichContent } from "@/components/RichContent";
import { Button } from "@/components/ui";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export default async function ProductKnowledgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const product = await prisma.product.findFirst({ where: { slug, isActive: true }, include: { knowledge: true } });
  if (!product?.knowledge?.isActive) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-sm text-ink-muted">{localizedField(locale, product.nameEn, product.nameAr)}</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold text-ink">{locale === "ar" ? "اعرف المزيد عن هذا المنتج" : "Know more about this product"}</h1>
      <RichContent html={localizedField(locale, product.knowledge.contentHtmlEn, product.knowledge.contentHtmlAr)} className="mt-6" />
      <Button asChild variant="outline" className="mt-8"><Link href={`/products/${product.slug}`}>{locale === "ar" ? "العودة إلى المنتج" : "Back to product"}</Link></Button>
    </article>
  );
}
