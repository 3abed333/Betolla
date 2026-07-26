import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Repair: my own curl test accidentally mangled this product's Arabic text into literal "?"
  // characters due to a shell/codepage encoding issue passing Arabic through a bash variable -
  // restoring the exact original values read earlier in this session, before that mistake.
  const restored = await prisma.product.update({
    where: { id: "cms0e2hcn006dkwa0k6expev8" },
    data: {
      nameAr: "مزيل مكياج زيتي يتحول لحليب",
      descriptionAr:
        "زيت منظف مغذٍّ يتحول عند ملامسته للماء إلى مستحلب حليبي يزيل كل أثر للمكياج.",
      stock: 54,
    },
  });
  console.log("Restored nameAr:", restored.nameAr);
  console.log("Restored descriptionAr:", restored.descriptionAr);
  console.log("Restored stock:", restored.stock);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
