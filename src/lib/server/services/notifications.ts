import "server-only";
import { prisma } from "@/lib/db";
import type { NotificationCategory, Role } from "@/generated/prisma/client";
import { logError } from "@/lib/server/logger";

export const DEFAULT_NOTIFICATION_PREFERENCES: {
  category: NotificationCategory;
  channel: "EMAIL" | "PUSH" | "IN_APP";
  enabled: boolean;
}[] = (["ORDER_UPDATES", "PROMOTIONS", "BACK_IN_STOCK", "LOYALTY_AND_WALLET", "SUPPORT"] as NotificationCategory[]).flatMap(
  (category) => [
    { category, channel: "EMAIL" as const, enabled: true },
    { category, channel: "IN_APP" as const, enabled: true },
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
  /** English fallback text - always stored as-is, rendered verbatim for legacy rows or if
   * titleKey/bodyKey is ever missing from the message catalog. */
  title: string;
  body: string;
  /** common.notificationEvents keys the notifications UI translates at render time, using the
   * VIEWER's own current locale (never the actor's locale at creation time). Optional so callers
   * can be migrated incrementally; omit to fall back to the English title/body everywhere. */
  titleKey?: string;
  bodyKey?: string;
  templateParams?: Record<string, string | number>;
  relatedOrderId?: string;
  /**
   * Identifies the logical event this call represents (e.g. "order:123:status:CONFIRMED").
   * When set, a retried call with the same eventKey is a no-op per channel instead of creating
   * a duplicate Notification row - see the Notification.eventKey doc comment in schema.prisma.
   */
  eventKey?: string;
}) {
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: params.userId, category: params.category, enabled: true, channel: { not: "SMS" } },
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
        titleKey: params.titleKey,
        bodyKey: params.bodyKey,
        params: params.templateParams,
        relatedOrderId: params.relatedOrderId,
        eventKey: params.eventKey,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    logError("notification_failed", error, {
      userId: params.userId,
      category: params.category,
      hasRelatedOrder: Boolean(params.relatedOrderId),
    });
    throw error;
  }
}

/**
 * Role-broadcast wrapper - notify() only ever targets one specific userId, there's no
 * "notify all Admins" concept at the DB/query level, so this resolves the recipient list and
 * calls notify() once per recipient (each still gated by their own NotificationPreference rows).
 */
export async function notifyRoles(
  roles: Role[],
  params: {
    category: NotificationCategory;
    title: string;
    body: string;
    titleKey?: string;
    bodyKey?: string;
    templateParams?: Record<string, string | number>;
    relatedOrderId?: string;
    eventKey?: string;
  },
) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true },
  });
  await Promise.all(recipients.map((r) => notify({ userId: r.id, ...params })));
}

/** Which NotificationCategory values are relevant to each non-customer role's permissions. */
export const ROLE_NOTIFICATION_CATEGORIES: Partial<Record<Role, NotificationCategory[]>> = {
  STAFF: ["SUPPORT", "OPERATIONS"],
  ADMIN: ["SUPPORT", "OPERATIONS"],
  DELIVERY: ["DELIVERY_ASSIGNMENTS"],
};

/** Default preference rows for a freshly created account, mirroring DEFAULT_NOTIFICATION_PREFERENCES's shape. */
export function buildDefaultPreferences(categories: NotificationCategory[]) {
  return categories.flatMap((category) => [
    { category, channel: "EMAIL" as const, enabled: true },
    { category, channel: "IN_APP" as const, enabled: true },
    { category, channel: "PUSH" as const, enabled: false },
  ]);
}

/**
 * Fans out to every wishlist that has this product, gated by each wishlist item's own
 * notifyOnPriceDrop/notifyOnRestock flag *and* the owner's general BACK_IN_STOCK category
 * preference (checked inside notify()) - both have to allow it.
 */
export async function notifyWishlistsOnProductChange(params: {
  productId: string;
  productNameEn: string;
  productNameAr: string;
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
        body: `${params.productNameEn} dropped to ${params.after.price.toFixed(3)} JD.`,
        titleKey: "priceDropTitle",
        bodyKey: "priceDropBody",
        templateParams: {
          productNameEn: params.productNameEn,
          productNameAr: params.productNameAr,
          price: params.after.price.toFixed(3),
        },
      });
    }
    if (restocked && item.notifyOnRestock) {
      await notify({
        userId: item.wishlist.userId,
        category: "BACK_IN_STOCK",
        title: "Back in stock",
        body: `${params.productNameEn} is back in stock.`,
        titleKey: "backInStockTitle",
        bodyKey: "backInStockBody",
        templateParams: { productNameEn: params.productNameEn, productNameAr: params.productNameAr },
      });
    }
  }
}
