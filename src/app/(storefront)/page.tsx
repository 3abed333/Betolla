import Link from "next/link";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui";
import { ProductCard } from "./ProductCard";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { HeroCarousel } from "./HeroCarousel";

export default async function HomePage() {
  const t = await getTranslations("storefront.home");
  const locale = (await getLocale()) as AppLocale;
  const [banners, categories, featuredProducts] = await Promise.all([
    prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
        ],
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ reviewCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {banners.length > 0 && <HeroCarousel label={t("carouselLabel")} slides={banners.map((banner) => ({
        id: banner.id,
        mediaType: banner.mediaType,
        desktopMediaUrl: banner.desktopMediaUrl,
        mobileMediaUrl: banner.mobileMediaUrl,
        posterUrl: banner.posterUrl,
        title: localizedField(locale, banner.titleEn, banner.titleAr),
        subtitle: localizedField(locale, banner.subtitleEn ?? "", banner.subtitleAr) || null,
        ctaLabel: localizedField(locale, banner.ctaLabelEn ?? "", banner.ctaLabelAr) || t("shopNow"),
        linkUrl: banner.linkUrl ?? "/products",
        focalPointX: banner.focalPointX,
        focalPointY: banner.focalPointY,
        autoAdvanceSeconds: banner.autoAdvanceSeconds,
      }))} />}

      <section>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("shopByCategory")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => {
            const categoryName = localizedField(locale, category.nameEn, category.nameAr);
            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-secondary p-4 text-center transition-shadow hover:shadow-md"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface">
                  {category.imageUrl && (
                    <Image src={category.imageUrl} alt={categoryName} fill sizes="80px" className="object-cover" />
                  )}
                </div>
                <span className="text-sm font-medium text-ink group-hover:text-cta">{categoryName}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-semibold text-ink">{t("featuredProducts")}</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/products">{t("viewAll")}</Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                slug: product.slug,
                nameEn: product.nameEn,
                nameAr: product.nameAr,
                descriptionEn: product.descriptionEn,
                descriptionAr: product.descriptionAr,
                price: Number(product.price),
                compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
                mainImageUrl: product.mainImageUrl,
                avgRating: Number(product.avgRating),
                reviewCount: product.reviewCount,
                stock: product.stock,
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
