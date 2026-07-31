import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { WishlistsClient } from "./WishlistsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.wishlists");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function WishlistsPage() {
  const session = await requireRole("CUSTOMER");
  const wishlists = await prisma.wishlist.findMany({
    where: { userId: session.userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <WishlistsClient
      initialWishlists={wishlists.map((w) => ({
        id: w.id,
        name: w.name,
        items: w.items.map((i) => ({
          id: i.id,
          priceAtAdd: i.priceAtAdd.toString(),
          notifyOnPriceDrop: i.notifyOnPriceDrop,
          notifyOnRestock: i.notifyOnRestock,
          product: {
            id: i.product.id,
            slug: i.product.slug,
            nameEn: i.product.nameEn,
            nameAr: i.product.nameAr,
            mainImageUrl: i.product.mainImageUrl,
            price: i.product.price.toString(),
            stock: i.product.stock,
          },
        })),
      }))}
    />
  );
}
