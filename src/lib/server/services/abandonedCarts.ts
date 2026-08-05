import "server-only";
import { prisma } from "@/lib/db";

export const ABANDONMENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Flips ACTIVE -> ABANDONED for carts that have sat untouched past the threshold. Carts with no
 * items are left alone (nothing to recover, nothing to show in /admin/abandoned-carts). Carts
 * naturally move back to ACTIVE on their own the moment the owner touches their cart again -
 * POST /api/cart force-sets status: "ACTIVE" on every sync, abandoned or not - so there's no
 * separate "reactivate" path to maintain here.
 */
export async function sweepAbandonedCarts(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ABANDONMENT_THRESHOLD_MS);
  const result = await prisma.cart.updateMany({
    where: {
      status: "ACTIVE",
      lastActivityAt: { lt: cutoff },
      items: { some: {} },
    },
    data: { status: "ABANDONED" },
  });
  return result.count;
}
