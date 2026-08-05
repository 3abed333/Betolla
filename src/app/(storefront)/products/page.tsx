import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProductCard } from "../ProductCard";
import { EmptyState } from "@/components/ui";
import { CategoryFilter } from "./CategoryFilter";
import type { Prisma } from "@/generated/prisma/client";
import { getActiveCategories, getProductsByCategory } from "@/lib/server/storefrontCache";
import { BetoKitExperience } from "@/app/(experience)/beto-kit/BetoKitExperience";

// The one category this scroll-driven film currently exists for. Reused as-is (same component,
// same video, same chapters) from the standalone /beto-kit page - not a fork, so the two never
// drift out of sync.
const BETO_LENSES_CATEGORY_SLUG = "beto-lenses";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("storefront.products");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const t = await getTranslations("storefront.products");

  let products;
  if (q) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      OR: [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { descriptionEn: { contains: q, mode: "insensitive" } },
      ],
    };
    products = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
  } else {
    products = await getProductsByCategory(category ?? null);
  }
  const categories = await getActiveCategories();
  const showBetoKitExperience = category === BETO_LENSES_CATEGORY_SLUG && !q;

  return (
    <div className="flex flex-col gap-6">
      {showBetoKitExperience && (
        // Breaks out of the storefront layout's max-w-7xl/px-4 content column so the film runs
        // full-viewport-width, same as it does on its own standalone page.
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          <BetoKitExperience />
        </div>
      )}
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
