import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const a = await prisma.deliveryAssignment.findUnique({
    where: { id: "cms0e2kp80130kwa0gh3rhwf5" },
    select: { status: true, failedReason: true, driverId: true, rating: true, deliveredAt: true },
  });
  console.log("Yousef's assignment after Khaled's attack attempts (should be unchanged: EN_ROUTE, no failedReason, no rating):");
  console.log(JSON.stringify(a, null, 2));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
