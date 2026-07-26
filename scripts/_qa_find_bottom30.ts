import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const all = await prisma.customerStats.findMany({
    select: { userId: true, totalSpent: true, segment: true },
    orderBy: { totalSpent: "asc" },
  });
  const bottomCount = Math.ceil(all.length * 0.31);
  const bottomUsers = all.slice(0, bottomCount);
  for (const u of bottomUsers) {
    const user = await prisma.user.findUnique({ where: { id: u.userId }, select: { email: true, firstName: true, lastName: true, isActive: true } });
    console.log(user?.email, user?.firstName, user?.lastName, "spent:", u.totalSpent.toString(), "active:", user?.isActive);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect();
  });
