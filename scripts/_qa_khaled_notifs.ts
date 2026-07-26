import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const notifs = await prisma.notification.findMany({
    where: { userId: "cms0e2gtm0007kwa0j0huypdp" }, // Khaled
    select: { category: true, title: true, isRead: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Khaled has ${notifs.length} total notifications:`);
  console.log(JSON.stringify(notifs, null, 2));
  const byCategory = new Map<string, number>();
  for (const n of notifs) byCategory.set(n.category, (byCategory.get(n.category) ?? 0) + 1);
  console.log("By category:", Object.fromEntries(byCategory));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
