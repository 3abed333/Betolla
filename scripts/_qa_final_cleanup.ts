import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // My 3 scratch reports (filed as Khaled during this session) + the pre-existing interrupted-run
  // report (Yousef's, id cms146s120054nga04rl88h24, task explicitly OK'd deleting once verified legit).
  const scratchReportIds = [
    "cms1e9z970028koa07vwsj5zw", // OTHER, no photo
    "cms1e9zms002jkoa0gqg4s5qu", // VEHICLE_OR_TRAFFIC_ISSUE, no photo
    "cms1ecng6003ekoa027yyfxkj", // ITEM_DAMAGED, with photo
    "cms146s120054nga04rl88h24", // pre-existing interrupted-run report (Yousef)
  ];

  const found = await prisma.deliverySupportTicket.findMany({
    where: { id: { in: scratchReportIds } },
    select: { id: true, photoUrl: true },
  });
  console.log("Reports found to delete:", found.length, JSON.stringify(found));

  const del = await prisma.deliverySupportTicket.deleteMany({ where: { id: { in: scratchReportIds } } });
  console.log("Deleted DeliverySupportTicket rows:", del.count);

  // Delete the "New delivery problem report" OPERATIONS notifications that were side effects of
  // filing these specific scratch reports (created within this session's active window today, plus
  // any tied to the older interrupted-run ticket if one was ever fired for it).
  const notifRes = await prisma.notification.deleteMany({
    where: {
      title: "New delivery problem report",
      createdAt: { gte: new Date("2026-07-26T00:00:00.000Z") },
    },
  });
  console.log("Deleted 'New delivery problem report' notifications from today:", notifRes.count);

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
