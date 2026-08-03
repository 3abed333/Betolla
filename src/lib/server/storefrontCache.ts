import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

const REVALIDATE_SECONDS = 60;

export const getHomepageData = unstable_cache(
  async () => {
    const now = new Date();
    const [banners, categories, featuredProducts] = await Promise.all([
      prisma.banner.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
    return { banners, categories, featuredProducts };
  },
  ["storefront-homepage"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getSiteSettings = unstable_cache(
  async () => prisma.siteSettings.findUnique({ where: { id: "default" } }),
  ["storefront-site-settings"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getActivePopupCampaignPool = unstable_cache(
  async () => {
    const now = new Date();
    return prisma.popupCampaign.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        template: true,
        trigger: true,
        imageUrl: true,
        audienceType: true,
        customerSegment: true,
        titleEn: true,
        titleAr: true,
        announcementEn: true,
        announcementAr: true,
        bodyHtmlEn: true,
        bodyHtmlAr: true,
        ctaLabelEn: true,
        ctaLabelAr: true,
        ctaUrl: true,
      },
    });
  },
  ["storefront-active-popup-campaigns"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getActiveCategories = unstable_cache(
  async () => prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ["storefront-active-categories"],
  { revalidate: REVALIDATE_SECONDS },
);

// Caches only bounded-cardinality lookups (all products, or by one of the ~handful of real
// categories). Free-text search (?q=) is intentionally left uncached in the caller — it has
// unbounded key cardinality and isn't worth the cache-storage growth.
export const getPublishedBlogPosts = unstable_cache(
  async () =>
    prisma.blogPost.findMany({
      where: { isPublished: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
    }),
  ["storefront-published-blog-posts"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getActiveBundles = unstable_cache(
  async () =>
    prisma.productBundle.findMany({
      where: { isActive: true },
      include: { items: { include: { product: true } } },
    }),
  ["storefront-active-bundles"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getProductBySlugWithDetails = unstable_cache(
  async (slug: string) =>
    prisma.product.findUnique({
      where: { slug },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true, knowledge: true },
    }),
  ["storefront-product-by-slug"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getProductsByCategory = unstable_cache(
  async (categorySlug: string | null) =>
    prisma.product.findMany({
      where: { isActive: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      orderBy: { createdAt: "desc" },
    }),
  ["storefront-products-by-category"],
  { revalidate: REVALIDATE_SECONDS },
);
