import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export async function getOrCreateDefaultWishlist(userId: string) {
  const existing = await prisma.wishlist.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  const t = await getTranslations("account.wishlists");
  return prisma.wishlist.create({ data: { userId, name: t("defaultListName") } });
}

export async function isProductWishlisted(userId: string, productId: string) {
  const item = await prisma.wishlistItem.findFirst({
    where: { productId, wishlist: { userId } },
  });
  return !!item;
}
