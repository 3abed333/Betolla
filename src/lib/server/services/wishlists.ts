import "server-only";
import { prisma } from "@/lib/db";

export async function getOrCreateDefaultWishlist(userId: string) {
  const existing = await prisma.wishlist.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.wishlist.create({ data: { userId, name: "My Wishlist" } });
}

export async function isProductWishlisted(userId: string, productId: string) {
  const item = await prisma.wishlistItem.findFirst({
    where: { productId, wishlist: { userId } },
  });
  return !!item;
}
