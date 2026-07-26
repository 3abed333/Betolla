import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProductCard } from "../ProductCard";
import { EmptyState } from "@/components/ui";
import { CategoryFilter } from "./CategoryFilter";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "All Products - Betolla Cosmetics" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const t = await getTranslations("storefront.products");

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (category) where.category = { slug: category };
  if (q) {
    where.OR = [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { descriptionEn: { contains: q, mode: "insensitive" } },
    ];
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-ink">
          {q ? t("resultsFor", { query: q }) : t("allProducts")}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t("productCount", { count: products.length })}</p>
      </div>

      <CategoryFilter categories={categories} activeSlug={category} />

      {products.length === 0 ? (
        <EmptyState
          title={t("noProductsFound")}
          description={t("noProductsDescription")}
        />
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
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
      )}
    </div>
  );
}
