import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui";
import { ProductCard } from "./ProductCard";

export default async function HomePage() {
  const t = await getTranslations("storefront.home");
  const [banners, categories, featuredProducts] = await Promise.all([
    prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ reviewCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const hero = banners[0];

  return (
    <div className="flex flex-col gap-16">
      {hero && (
        <Link href={hero.linkUrl ?? "/products"} className="group relative block overflow-hidden rounded-3xl">
          <div className="relative aspect-[3/1] w-full">
            <Image src={hero.imageUrl} alt={hero.titleEn} fill sizes="100vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-8">
            <h1 className="font-heading text-3xl font-semibold text-white sm:text-4xl">{hero.titleEn}</h1>
            <span className="mt-3 inline-block rounded-full bg-cta px-5 py-2 text-sm font-medium text-cta-foreground">
              {t("shopNow")}
            </span>
          </div>
        </Link>
      )}

      <section>
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("shopByCategory")}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-secondary p-4 text-center transition-shadow hover:shadow-md"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface">
                {category.imageUrl && (
                  <Image src={category.imageUrl} alt={category.nameEn} fill sizes="80px" className="object-cover" />
                )}
              </div>
              <span className="text-sm font-medium text-ink group-hover:text-cta">{category.nameEn}</span>
            </Link>
          ))}
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
                descriptionEn: product.descriptionEn,
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
