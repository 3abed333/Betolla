import "server-only";
import { prisma } from "@/lib/db";
import type { NotificationCategory } from "@/generated/prisma/client";

export const DEFAULT_NOTIFICATION_PREFERENCES: {
  category: NotificationCategory;
  channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
  enabled: boolean;
}[] = (["ORDER_UPDATES", "PROMOTIONS", "BACK_IN_STOCK", "LOYALTY_AND_WALLET", "SUPPORT"] as NotificationCategory[]).flatMap(
  (category) => [
    { category, channel: "EMAIL" as const, enabled: true },
    { category, channel: "IN_APP" as const, enabled: true },
    { category, channel: "SMS" as const, enabled: category === "ORDER_UPDATES" },
    { category, channel: "PUSH" as const, enabled: false },
  ],
);

/**
 * Fully simulated - never calls a real email/SMS/push provider (see AGENTS.md/PROGRESS.md §3).
 * Writes one Notification row per channel the recipient has enabled for this category; writes
 * nothing at all if every channel is off (or no preference rows exist yet, which the grid UI
 * itself already treats as "off" for missing rows - see NotificationPreferencesGrid.tsx).
 */
export async function notify(params: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  relatedOrderId?: string;
}) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: params.userId, category: params.category, enabled: true },
  });
  if (prefs.length === 0) return;

  await prisma.notification.createMany({
    data: prefs.map((p) => ({
      userId: params.userId,
      category: params.category,
      channel: p.channel,
      status: "SENT",
      title: params.title,
      body: params.body,
      relatedOrderId: params.relatedOrderId,
    })),
  });
}

/**
 * Fans out to every wishlist that has this product, gated by each wishlist item's own
 * notifyOnPriceDrop/notifyOnRestock flag *and* the owner's general BACK_IN_STOCK category
 * preference (checked inside notify()) - both have to allow it.
 */
export async function notifyWishlistsOnProductChange(params: {
  productId: string;
  productName: string;
  before: { price: number; stock: number };
  after: { price: number; stock: number };
}) {
  const priceDropped = params.after.price < params.before.price;
  const restocked = params.before.stock === 0 && params.after.stock > 0;
  if (!priceDropped && !restocked) return;

  const items = await prisma.wishlistItem.findMany({
    where: {
      productId: params.productId,
      OR: [
        ...(priceDropped ? [{ notifyOnPriceDrop: true }] : []),
        ...(restocked ? [{ notifyOnRestock: true }] : []),
      ],
    },
    include: { wishlist: { select: { userId: true } } },
  });

  for (const item of items) {
    if (priceDropped && item.notifyOnPriceDrop) {
      await notify({
        userId: item.wishlist.userId,
        category: "BACK_IN_STOCK",
        title: "Price drop on your wishlist",
        body: `${params.productName} dropped to ${params.after.price.toFixed(3)} JD.`,
      });
    }
    if (restocked && item.notifyOnRestock) {
      await notify({
        userId: item.wishlist.userId,
        category: "BACK_IN_STOCK",
        title: "Back in stock",
        body: `${params.productName} is back in stock.`,
      });
    }
  }
}
