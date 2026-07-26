import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * One-time backfill for Phase 16's COD-accrual fix (see PROGRESS.md).
 *
 * Root cause: Cash-on-Delivery orders are created with paymentStatus "UNPAID" at checkout, and
 * before this phase nothing in the app ever flipped that flag - not on delivery, not anywhere in
 * updateOrderStatus()/syncOrderStatusFromDelivery(). totalSpent/loyalty-point accrual is gated
 * strictly on paymentStatus === "PAID" (recomputeCustomerStatsForUser, and the loyaltyPointsEarned
 * calculation in checkout.ts), so every COD order silently never counted toward a customer's
 * spend or points, even once genuinely delivered and cash collected at the door.
 *
 * The live-flow fix (confirmCodPaymentOnDelivery, in src/lib/server/services/customerStats.ts) now
 * handles this correctly for every order going forward. This script is the one-time correction for
 * orders that were ALREADY delivered before that fix landed - it is not a standing migration and
 * should only ever need to run once. Run via: npx tsx scripts/backfill-cod-accrual.ts
 *
 * This script intentionally does NOT import src/lib/db.ts or the customerStats service - both are
 * marked "server-only" (a Next.js marker package that throws at runtime outside Next's own
 * "react-server" module condition), so a standalone script can't import them directly. Instead it
 * builds its own PrismaClient and mirrors confirmCodPaymentOnDelivery's + recomputeCustomerStats-
 * ForUser's exact logic inline - the same pattern prisma/seed.ts already uses for its own
 * standalone customer-stats computation.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function recomputeCustomerStats(userId: string) {
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
  return { totalSpent, orderCount };
}

async function main() {
  const affected = await prisma.order.findMany({
    where: { status: "DELIVERED", paymentMethodLabel: "Cash on Delivery", paymentStatus: "UNPAID" },
    select: { id: true, orderNumber: true, userId: true, total: true },
  });

  console.log(`Found ${affected.length} delivered COD order(s) never credited.\n`);
  if (affected.length === 0) {
    console.log("Nothing to backfill.");
    await prisma.$disconnect();
    return;
  }

  const loyaltyConfig = await prisma.loyaltyConfig.findFirst();
  const pointsPerJd = loyaltyConfig ? Number(loyaltyConfig.pointsPerJdSpent) : 1;

  const affectedUserIds = new Set<string>();

  for (const order of affected) {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: order.userId }, select: { loyaltyPointsBalance: true, email: true } });
    const earned = Math.floor(Number(order.total) * pointsPerJd);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", loyaltyPointsEarned: earned } });
      if (earned > 0) {
        await tx.loyaltyTransaction.create({
          data: { userId: order.userId, type: "EARN", points: earned, orderId: order.id, note: "COD payment confirmed on delivery (backfill)" },
        });
        await tx.user.update({ where: { id: order.userId }, data: { loyaltyPointsBalance: { increment: earned } } });
      }
    });

    console.log(
      `${order.orderNumber} (${before.email}): total ${order.total} JD -> paymentStatus PAID, ` +
        `+${earned} loyalty points (balance ${before.loyaltyPointsBalance} -> ${before.loyaltyPointsBalance + earned})`,
    );
    affectedUserIds.add(order.userId);
  }

  console.log("\nRecomputing CustomerStats for affected customers...");
  for (const userId of affectedUserIds) {
    const after = await recomputeCustomerStats(userId);
    console.log(`  userId ${userId}: totalSpent=${after.totalSpent.toFixed(2)} orderCount=${after.orderCount}`);
  }

  console.log(`\nDone. ${affected.length} order(s) corrected across ${affectedUserIds.size} customer(s).`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
