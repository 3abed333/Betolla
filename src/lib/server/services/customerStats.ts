import "server-only";
import { prisma } from "@/lib/db";

/**
 * The one place raw customer spend aggregates get recomputed - called whenever an order's
 * payment status flips to PAID (see checkout.ts / order status services). This updates
 * totalSpent/orderCount/lastOrderAt only; RFM quintile scores/segment are relative to the
 * whole customer base and are refreshed separately via the admin "recalculate" action
 * (recomputeAllRfmSegments, Phase 7/11) rather than on every single order.
 */
export async function recomputeCustomerStatsForUser(userId: string) {
  const paidOrders = await prisma.order.findMany({
    where: { userId, paymentStatus: "PAID" },
    select: { total: true, createdAt: true },
  });

  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
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
