import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orderId = "cms0gkmcp000vr4a00ae1g3vu"; // BT-MS0GKMAV499
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, status: true, paymentStatus: true, paymentMethodLabel: true, loyaltyPointsEarned: true, userId: true },
  });
  console.log("BEFORE - Order:", JSON.stringify(order, null, 2));
  const history = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  console.log("BEFORE - OrderStatusHistory count:", history.length);
  console.log(JSON.stringify(history, null, 2));
  const notifCount = await prisma.notification.count({ where: { userId: order!.userId } });
  console.log("BEFORE - customer total notification count:", notifCount);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
