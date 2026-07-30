import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cln008 = await prisma.product.findUnique({ where: { id: "cms0e2hcn006dkwa0k6expev8" } });
  console.log("=== CLN-008 (the product I edited+restored) ===");
  console.log(
    cln008
      ? JSON.stringify({ sku: cln008.sku, nameEn: cln008.nameEn, nameAr: cln008.nameAr, stock: cln008.stock, isActive: cln008.isActive })
      : "NOT FOUND / MISSING",
  );

  const suspect = await prisma.product.findMany({
    where: { OR: [{ sku: { contains: "QA-TEST-STAFF" } }, { nameEn: { contains: "QA-TEST-STAFF" } }] },
  });
  console.log("\n=== Any product matching 'QA-TEST-STAFF-001' ===");
  console.log(suspect.length === 0 ? "None found (never existed, or already gone)" : JSON.stringify(suspect, null, 2));

  const myDriver = await prisma.user.findUnique({ where: { id: "cms1e93l50020koa0sw51jq2n" } });
  console.log("\n=== My test delivery account (qatest.driver.staffaudit@betolla.com) ===");
  console.log(myDriver ? `Still present: ${myDriver.email}, isActive=${myDriver.isActive}` : "Not present");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
