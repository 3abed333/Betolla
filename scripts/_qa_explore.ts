import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Orders with both storeCreditUsed>0 AND loyaltyPointsUsed>0 ===");
  const multiDiscountOrders = await prisma.order.findMany({
    where: { storeCreditUsed: { gt: 0 }, loyaltyPointsUsed: { gt: 0 } },
    select: { id: true, orderNumber: true, status: true, subtotal: true, discountTotal: true, storeCreditUsed: true, loyaltyRedemptionValue: true, shippingFee: true, total: true, userId: true },
    take: 5,
  });
  console.log(JSON.stringify(multiDiscountOrders, null, 2));

  console.log("\n=== Orders with discountTotal>0 only (promo) ===");
  const promoOnly = await prisma.order.findMany({
    where: { discountTotal: { gt: 0 } },
    select: { id: true, orderNumber: true, status: true, discountTotal: true },
    take: 3,
  });
  console.log(JSON.stringify(promoOnly, null, 2));

  console.log("\n=== VIP20 promo code ===");
  const vip20 = await prisma.promoCode.findFirst({ where: { code: "VIP20" } });
  console.log(JSON.stringify(vip20, null, 2));

  console.log("\n=== LoyaltyConfig ===");
  const lc = await prisma.loyaltyConfig.findFirst();
  console.log(JSON.stringify(lc, null, 2));

  console.log("\n=== Orders needing driver (CONFIRMED/ON_DELIVERY, no active assignment) ===");
  const needsDriver = await prisma.order.findMany({
    where: { status: { in: ["CONFIRMED", "ON_DELIVERY"] }, deliveryAssignments: { none: { status: { not: "FAILED" } } } },
    select: { id: true, orderNumber: true, status: true },
  });
  console.log(`count: ${needsDriver.length}`);
  console.log(JSON.stringify(needsDriver.slice(0, 5), null, 2));

  console.log("\n=== Total CONFIRMED/ON_DELIVERY orders ===");
  const totalConfOrOnDel = await prisma.order.count({ where: { status: { in: ["CONFIRMED", "ON_DELIVERY"] } } });
  console.log(totalConfOrOnDel);

  console.log("\n=== A customer with store credit AND loyalty points (for adjustment test) ===");
  const customer = await prisma.user.findFirst({
    where: { role: "CUSTOMER", storeCreditBalance: { gt: 5 } },
    select: { id: true, firstName: true, lastName: true, email: true, storeCreditBalance: true, loyaltyPointsBalance: true },
  });
  console.log(JSON.stringify(customer, null, 2));

  console.log("\n=== Abandoned carts ===");
  const abandonedCarts = await prisma.cart.findMany({ where: { status: "ABANDONED" }, select: { id: true, userId: true, updatedAt: true }, take: 5 });
  console.log(JSON.stringify(abandonedCarts, null, 2));

  console.log("\n=== Support tickets (OPEN, unassigned) ===");
  const openTickets = await prisma.supportTicket.findMany({ where: { status: "OPEN" }, select: { id: true, subject: true, userId: true, assignedToId: true }, take: 5 });
  console.log(JSON.stringify(openTickets, null, 2));

  console.log("\n=== Delivery support tickets ===");
  const dsTickets = await prisma.deliverySupportTicket.findMany({ select: { id: true, problemType: true, urgency: true, status: true, driverId: true, staffNote: true }, take: 5 });
  console.log(JSON.stringify(dsTickets, null, 2));

  console.log("\n=== Shipping zones ===");
  const zones = await prisma.shippingZone.findMany({ select: { id: true, cityEn: true, fee: true, isActive: true } });
  console.log(JSON.stringify(zones, null, 2));

  console.log("\n=== Loyalty tiers ===");
  const tiers = await prisma.loyaltyTier.findMany({ select: { id: true, nameEn: true, minPoints: true, sortOrder: true } });
  console.log(JSON.stringify(tiers, null, 2));

  console.log("\n=== Order with ALL 4 conditional lines (discount+storeCredit+loyalty) ===");
  const allFour = await prisma.order.findMany({
    where: { discountTotal: { gt: 0 }, storeCreditUsed: { gt: 0 }, loyaltyPointsUsed: { gt: 0 } },
    select: { id: true, orderNumber: true, status: true },
  });
  console.log(JSON.stringify(allFour, null, 2));

  console.log("\n=== Order with discount + storeCredit (no loyalty) ===");
  const discPlusCredit = await prisma.order.findMany({
    where: { discountTotal: { gt: 0 }, storeCreditUsed: { gt: 0 } },
    select: { id: true, orderNumber: true, status: true },
  });
  console.log(JSON.stringify(discPlusCredit, null, 2));

  console.log("\n=== Order with discount + loyalty (no storeCredit) ===");
  const discPlusLoyalty = await prisma.order.findMany({
    where: { discountTotal: { gt: 0 }, loyaltyPointsUsed: { gt: 0 } },
    select: { id: true, orderNumber: true, status: true },
  });
  console.log(JSON.stringify(discPlusLoyalty, null, 2));

  console.log("\n=== Staff accounts ===");
  const staff = await prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, firstName: true, lastName: true, email: true, isActive: true } });
  console.log(JSON.stringify(staff, null, 2));

  console.log("\n=== Delivery accounts ===");
  const drivers = await prisma.user.findMany({ where: { role: "DELIVERY" }, select: { id: true, firstName: true, lastName: true, email: true, isActive: true } });
  console.log(JSON.stringify(drivers, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
