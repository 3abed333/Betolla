import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orderId = "cms0gkmcp000vr4a00ae1g3vu";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, status: true, paymentStatus: true, loyaltyPointsEarned: true, userId: true },
  });
  console.log("FINAL - Order:", JSON.stringify(order, null, 2));
  const history = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  console.log("FINAL - OrderStatusHistory count:", history.length);
  console.log(JSON.stringify(history, null, 2));

  const notifs = await prisma.notification.findMany({
    where: { userId: order!.userId, createdAt: { gte: new Date("2026-07-26T06:00:00.000Z") } },
    orderBy: { createdAt: "asc" },
  });
  console.log("Customer notifications created during this test:", JSON.stringify(notifs, null, 2));

  const loyaltyTx = await prisma.loyaltyTransaction.findMany({ where: { orderId } });
  console.log("Loyalty tx for this order (should still be just the original 1):", JSON.stringify(loyaltyTx, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
