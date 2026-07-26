import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emails = ["sara.khoury@example.com", "farah.odeh@example.com", "rasha.sukkar@example.com"];
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    const usages = await prisma.promoCodeUsage.findMany({
      where: { userId: user.id },
      include: { promoCode: { select: { code: true } } },
    });
    console.log(email, "usages:", usages.map((u) => u.promoCode.code));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect();
  });
