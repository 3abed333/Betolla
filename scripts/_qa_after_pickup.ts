import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orderId = "cms0gkmcp000vr4a00ae1g3vu";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, status: true, paymentStatus: true },
  });
  console.log("AFTER PICKED_UP - Order:", JSON.stringify(order, null, 2));
  const history = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  console.log("AFTER PICKED_UP - OrderStatusHistory count:", history.length);
  console.log(JSON.stringify(history, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
