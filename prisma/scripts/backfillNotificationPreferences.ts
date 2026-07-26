import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import type { NotificationCategory, Role } from "../../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// One-time backfill for Staff/Delivery/Admin accounts created before role-aware notifications
// existed (createManagedAccount()/seed.ts now seed these for accounts going forward - see
// notifications.ts's ROLE_NOTIFICATION_CATEGORIES). Idempotent: only fills gaps, safe to re-run.
const ROLE_CATEGORIES: Partial<Record<Role, NotificationCategory[]>> = {
  STAFF: ["SUPPORT", "OPERATIONS"],
  ADMIN: ["SUPPORT", "OPERATIONS"],
  DELIVERY: ["DELIVERY_ASSIGNMENTS"],
};
const CHANNELS = ["EMAIL", "IN_APP", "SMS", "PUSH"] as const;

async function main() {
  let created = 0;
  for (const role of Object.keys(ROLE_CATEGORIES) as Role[]) {
    const categories = ROLE_CATEGORIES[role]!;
    const users = await prisma.user.findMany({ where: { role }, select: { id: true } });
    for (const user of users) {
      const existing = await prisma.notificationPreference.findMany({
        where: { userId: user.id, category: { in: categories } },
        select: { category: true, channel: true },
      });
      const have = new Set(existing.map((e) => `${e.category}:${e.channel}`));
      const toCreate = categories.flatMap((category) =>
        CHANNELS.filter((channel) => !have.has(`${category}:${channel}`)).map((channel) => ({
          userId: user.id,
          category,
          channel,
          // Opted IN by default (EMAIL + IN_APP) - these are operational notifications
          // Staff/Admin/Delivery need to see, not marketing to opt into.
          enabled: channel === "EMAIL" || channel === "IN_APP",
        })),
      );
      if (toCreate.length > 0) {
        await prisma.notificationPreference.createMany({ data: toCreate });
        created += toCreate.length;
      }
    }
  }
  console.log(`Backfill complete - created ${created} NotificationPreference rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
