import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui";
import { StarRatingDisplay } from "@/components/ui/StarRating";
import { Gallery } from "./Gallery";
import { AddToCartForm } from "./AddToCartForm";
import { ReviewsSection } from "./ReviewsSection";
import { AddToWishlistButton } from "@/components/AddToWishlistButton";
import { Money } from "@/components/Money";
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
  return {
    title: product
      ? t("metaTitle", { name: product.nameEn, brand: tCommon("brand") })
      : t("metaTitleFallback", { brand: tCommon("brand") }),
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("storefront.productDetail");
  const locale = (await getLocale()) as AppLocale;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });
  if (!product || !product.isActive) notFound();

  const images = [product.mainImageUrl, ...product.images.map((i) => i.url)];
  const onSale = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);

  return (
    <div className="flex flex-col gap-16">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Gallery images={images} alt={product.nameEn} />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">{product.category.nameEn}</p>
          <h1 className="font-heading text-3xl font-semibold text-ink">{product.nameEn}</h1>
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
          <p className="text-ink-muted">{product.descriptionEn}</p>
          {product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 15) && (
            <p className="text-sm text-accent">{t("onlyLeftInStock", { count: product.stock })}</p>
          )}
          <div className="mt-2 flex items-start gap-3">
            <div className="flex-1">
              <AddToCartForm
                id={product.id}
                slug={product.slug}
                nameEn={product.nameEn}
                nameAr={product.nameAr}
                price={Number(product.price)}
                imageUrl={product.mainImageUrl}
                stock={product.stock}
              />
            </div>
            <AddToWishlistButton productId={product.id} />
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} />
    </div>
  );
}
