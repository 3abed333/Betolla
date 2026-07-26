import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emails = [
    "sara.khoury@example.com",
    "nour.abdallah@example.com",
    "farah.odeh@example.com",
    "aya.nimri@example.com",
  ];
  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        storeCreditBalance: true,
        loyaltyPointsBalance: true,
      },
    });
    if (!user) {
      console.log(email, "NOT FOUND");
      continue;
    }
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true, orderNumber: true, status: true, total: true, paymentStatus: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const addresses = await prisma.address.findMany({ where: { userId: user.id }, select: { id: true, city: true } });
    const wishlists = await prisma.wishlist.findMany({ where: { userId: user.id }, select: { id: true, name: true } });
    const tickets = await prisma.supportTicket.findMany({ where: { userId: user.id }, select: { id: true, subject: true } });
    console.log("====", email, user.id, "====");
    console.log("storeCredit:", user.storeCreditBalance.toString(), "loyaltyPoints:", user.loyaltyPointsBalance);
    console.log("orders:", JSON.stringify(orders, null, 0));
    console.log("addresses:", JSON.stringify(addresses));
    console.log("wishlists:", JSON.stringify(wishlists));
    console.log("tickets:", JSON.stringify(tickets));
  }

  console.log("\n=== Promo codes ===");
  const promos = await prisma.promoCode.findMany({
    select: {
      code: true,
      discountType: true,
      discountValue: true,
      minOrderTotal: true,
      targetSegment: true,
      isActive: true,
      startsAt: true,
      expiresAt: true,
      usageLimitTotal: true,
      usageLimitPerUser: true,
    },
  });
  console.log(JSON.stringify(promos, null, 2));

  console.log("\n=== Loyalty config ===");
  const cfg = await prisma.loyaltyConfig.findFirst();
  console.log(cfg);

  console.log("\n=== A DELIVERED order with a reviewable item + a delivered delivery-assignment, for Sara ===");
  const sara = await prisma.user.findUnique({ where: { email: "sara.khoury@example.com" } });
  if (sara) {
    const delivered = await prisma.order.findMany({
      where: { userId: sara.id, status: "DELIVERED" },
      include: { items: { include: { reviews: true } }, deliveryAssignments: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    for (const o of delivered) {
      console.log(
        o.orderNumber,
        o.id,
        "items:",
        o.items.map((i) => ({ id: i.id, productId: i.productId, hasReview: i.reviews.length > 0 })),
        "deliveryAssignments:",
        o.deliveryAssignments.map((d) => ({ id: d.id, status: d.status, rating: d.rating })),
      );
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect();
  });
