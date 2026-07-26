import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== A few active, in-stock products ===");
  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 5 } },
    select: { id: true, nameEn: true, slug: true, price: true, stock: true },
    take: 8,
    orderBy: { price: "asc" },
  });
  console.log(JSON.stringify(products, null, 2));

  console.log("\n=== Customer segments (percentile-based TOP_30/BOTTOM_30) ===");
  const all = await prisma.customerStats.findMany({
    select: { userId: true, totalSpent: true, segment: true },
    orderBy: { totalSpent: "asc" },
  });
  const emails = [
    "sara.khoury@example.com",
    "nour.abdallah@example.com",
    "farah.odeh@example.com",
    "aya.nimri@example.com",
  ];
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    const index = all.findIndex((c) => c.userId === user.id);
    const percentile = index / Math.max(1, all.length - 1);
    const segment = percentile >= 0.7 ? "TOP_30" : percentile <= 0.3 ? "BOTTOM_30" : "MIDDLE";
    console.log(
      email,
      "totalSpent:",
      all[index]?.totalSpent?.toString(),
      "percentile:",
      percentile.toFixed(2),
      "->",
      segment,
      "rfmSegment:",
      all[index]?.segment,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect();
  });
