import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const n = await prisma.notification.findFirst({
    where: { title: "Delivery attempt failed", body: { contains: "gate code" } },
    orderBy: { createdAt: "desc" },
  });
  console.log("Notification body:", JSON.stringify(n?.body));
  console.log("Contains double period '..'? ", n?.body.includes(".."));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
