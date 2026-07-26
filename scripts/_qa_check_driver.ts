import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  const needsDriver = await prisma.order.findMany({
    where: { status: { in: ["CONFIRMED", "ON_DELIVERY"] }, deliveryAssignments: { none: { status: { not: "FAILED" } } } },
    select: { orderNumber: true },
  });
  console.log("needsDriver count:", needsDriver.length, needsDriver.map(o=>o.orderNumber));
  const bt1009 = await prisma.order.findUnique({ where: { id: "cms0e2hvy00a6kwa0yfalw5u0" }, include: { deliveryAssignments: true } });
  console.log("BT-1009:", JSON.stringify(bt1009, null, 2));
  await prisma.$disconnect();
}
main();
