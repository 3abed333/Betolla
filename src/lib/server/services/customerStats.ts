import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "./notifications";

/**
 * The one place raw customer spend aggregates get recomputed - called whenever an order's
 * payment status flips to PAID (see checkout.ts / order status services). This updates
 * totalSpent/orderCount/lastOrderAt only; RFM quintile scores/segment are relative to the
 * whole customer base and are refreshed separately via the admin "recalculate" action
 * (recomputeAllRfmSegments, Phase 7/11) rather than on every single order.
 */
export async function recomputeCustomerStatsForUser(userId: string) {
  const paidOrders = await prisma.order.findMany({
    where: { userId, paymentStatus: "PAID", status: { not: "CANCELLED" } },
    select: { total: true, refundedAmount: true, createdAt: true },
  });

  const totalSpent = paidOrders.reduce(
    (sum, order) => sum + Number(order.total) - Number(order.refundedAmount),
    0,
  );
  const orderCount = paidOrders.length;
  const lastOrderAt = paidOrders.length
    ? paidOrders.reduce((latest, o) => (o.createdAt > latest ? o.createdAt : latest), paidOrders[0].createdAt)
    : null;

  await prisma.customerStats.upsert({
    where: { userId },
    create: { userId, totalSpent, orderCount, lastOrderAt },
    update: { totalSpent, orderCount, lastOrderAt },
  });
}

/**
 * COD orders are created UNPAID at checkout (see checkout.ts) and nothing else in the codebase
 * ever flips that - for Cash on Delivery specifically, delivery IS the payment-confirmation event
 * (cash changes hands at the door, there's no separate "mark as paid" step in this business's
 * workflow). Called when a COD order reaches DELIVERED: flips paymentStatus to PAID, credits the
 * loyalty points checkout skipped (loyaltyPointsEarned was baked in as 0 for COD at checkout time,
 * since it was gated on paymentStatus === "PAID" then), and recomputes CustomerStats so
 * totalSpent/orderCount finally include this order. No-ops for anything that isn't an UNPAID
 * Cash-on-Delivery order, so it's safe to call unconditionally - the one-time backfill script for
 * already-delivered COD orders reuses this exact function rather than duplicating the logic.
 */
export async function confirmCodPaymentOnDelivery(orderId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (
      !order ||
      order.status !== "DELIVERED" ||
      order.paymentMethodLabel !== "Cash on Delivery" ||
      order.paymentStatus !== "UNPAID"
    ) return null;
    const loyaltyConfig = await tx.loyaltyConfig.findFirst();
    const pointsPerJd = loyaltyConfig ? Number(loyaltyConfig.pointsPerJdSpent) : 1;
    const earned = Math.floor(Number(order.total) * pointsPerJd);
    const changed = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "DELIVERED",
        paymentMethodLabel: "Cash on Delivery",
        paymentStatus: "UNPAID",
      },
      data: { paymentStatus: "PAID", loyaltyPointsEarned: earned },
    });
    if (changed.count !== 1) return null;
    if (earned > 0) {
      await tx.loyaltyTransaction.create({
        data: { userId: order.userId, type: "EARN", points: earned, orderId, note: "COD payment confirmed on delivery" },
      });
      await tx.user.update({ where: { id: order.userId }, data: { loyaltyPointsBalance: { increment: earned } } });
    }
    return { order, earned };
  });
  if (!result) return;

  await recomputeCustomerStatsForUser(result.order.userId);

  if (result.earned > 0) {
    await notify({
      userId: result.order.userId,
      category: "LOYALTY_AND_WALLET",
      title: "Loyalty points earned",
      body: `You earned ${result.earned} points on order ${result.order.orderNumber}.`,
      titleKey: "loyaltyPointsEarnedTitle",
      bodyKey: "loyaltyPointsEarnedBody",
      templateParams: { points: result.earned, orderNumber: result.order.orderNumber },
      relatedOrderId: result.order.id,
      ctaPath: "/account/wallet",
      ctaLabelKey: "viewWallet",
    });
  }
}

function quintileScore(values: number[], value: number, higherIsBetter: boolean) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= value);
  const percentile = rank / Math.max(1, sorted.length - 1);
  const score = Math.min(5, Math.max(1, Math.ceil(percentile * 5)));
  return higherIsBetter ? score : 6 - score;
}

function segmentFor(r: number, f: number, m: number) {
  if (r >= 4 && f >= 4 && m >= 4) return "CHAMPIONS" as const;
  if (f >= 4 && m >= 3) return "LOYAL" as const;
  if (r >= 4 && f <= 2) return "NEW_CUSTOMER" as const;
  if (r <= 2 && f >= 3) return "AT_RISK" as const;
  if (r <= 2 && f <= 2 && m <= 2) return "LOST" as const;
  if (r >= 3 && f <= 3) return "POTENTIAL_LOYALIST" as const;
  return "NEEDS_ATTENTION" as const;
}

/**
 * Refreshes every customer's RFM quintile scores + segment in one pass, relative to the whole
 * customer base at the moment it's run - same algorithm the seed script uses to seed initial
 * segments, extracted here so it's callable on demand (admin "Recalculate" action) instead of
 * only existing as one-off seed logic. Deliberately *not* run automatically on every order (see
 * recomputeCustomerStatsForUser's docstring) - quintiles are population-relative, so recomputing
 * one customer's segment in isolation would be meaningless without also re-ranking everyone else.
 */
export async function recomputeAllRfmSegments() {
  const stats = await prisma.customerStats.findMany({ select: { id: true, userId: true, totalSpent: true, orderCount: true, lastOrderAt: true } });
  if (stats.length === 0) return { updated: 0 };

  const now = new Date();
  const monetaryValues = stats.map((r) => Number(r.totalSpent));
  const frequencyValues = stats.map((r) => r.orderCount);
  const recencyValues = stats.map((r) => (r.lastOrderAt ? now.getTime() - r.lastOrderAt.getTime() : Infinity));

  for (const row of stats) {
    const recencyMs = row.lastOrderAt ? now.getTime() - row.lastOrderAt.getTime() : Infinity;
    const recencyScore = quintileScore(recencyValues, recencyMs, false);
    const frequencyScore = quintileScore(frequencyValues, row.orderCount, true);
    const monetaryScore = quintileScore(monetaryValues, Number(row.totalSpent), true);
    await prisma.customerStats.update({
      where: { id: row.id },
      data: { recencyScore, frequencyScore, monetaryScore, segment: segmentFor(recencyScore, frequencyScore, monetaryScore) },
    });
  }

  return { updated: stats.length };
}
