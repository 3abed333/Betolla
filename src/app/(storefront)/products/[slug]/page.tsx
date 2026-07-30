import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge, Button } from "@/components/ui";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { Gallery } from "./Gallery";
import { AddToCartForm } from "./AddToCartForm";
import { ReviewsSection } from "./ReviewsSection";
import { AddToWishlistButton } from "@/components/AddToWishlistButton";
import { Money } from "@/components/Money";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  const t = await getTranslations("storefront.productDetail");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;
  return {
    title: product
      ? t("metaTitle", { name: localizedField(locale, product.nameEn, product.nameAr), brand: tCommon("brand") })
      : t("metaTitleFallback", { brand: tCommon("brand") }),
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("storefront.productDetail");
  const locale = (await getLocale()) as AppLocale;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true, knowledge: true },
  });
  if (!product || !product.isActive) notFound();

  const images = [...new Set([product.mainImageUrl, ...product.images.map((i) => i.url)])];
  const onSale = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const productName = localizedField(locale, product.nameEn, product.nameAr);
  const categoryName = localizedField(locale, product.category.nameEn, product.category.nameAr);
  const description = localizedField(locale, product.descriptionEn, product.descriptionAr);

  return (
    <div className="flex flex-col gap-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Gallery images={images} alt={productName} />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">{categoryName}</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">{productName}</h1>
          {product.reviewCount > 0 && (
            <StarRatingDisplay rating={Number(product.avgRating)} count={product.reviewCount} />
          )}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-ink">
              <Money value={Number(product.price)} locale={locale} />
            </span>
            {onSale && (
              <span className="text-lg text-ink-muted line-through">
                <Money value={Number(product.compareAtPrice)} locale={locale} />
              </span>
            )}
            {onSale && <Badge variant="accent">{t("sale")}</Badge>}
          </div>
          <p className="text-ink-muted">{description}</p>
          {product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 15) && (
            <p className="text-sm text-accent">{t("onlyLeftInStock", { count: product.stock })}</p>
          )}
          <div className="mt-2 flex items-start gap-3">
            <div className="flex flex-1 flex-col gap-3">
              <AddToCartForm
                id={product.id}
                slug={product.slug}
                nameEn={product.nameEn}
                nameAr={product.nameAr}
                price={Number(product.price)}
                imageUrl={product.mainImageUrl}
                stock={product.stock}
              />
              {product.knowledge?.isActive && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/products/${product.slug}/learn`}>{t("knowMore")}</Link>
                </Button>
              )}
            </div>
            <AddToWishlistButton productId={product.id} />
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} />
    </div>
  );
}
