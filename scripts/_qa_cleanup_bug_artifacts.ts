import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Delete only the two spurious OrderStatusHistory rows created by the confirmed
  // syncOrderStatusFromDelivery regression bug repro (ids captured from the live before/after read).
  const delHistory = await prisma.orderStatusHistory.deleteMany({
    where: { id: { in: ["cms1e734k001okoa0qg7ukphn", "cms1e7o17001ukoa0evtcn9jd"] } },
  });
  console.log("Deleted spurious OrderStatusHistory rows:", delHistory.count);

  const delNotifs = await prisma.notification.deleteMany({
    where: {
      id: {
        in: [
          "cms1e7351001pkoa03wq57rnt",
          "cms1e7351001qkoa0z9fc3jxb",
          "cms1e7351001rkoa02l9gelru",
          "cms1e7o21001wkoa0sp8bzmb9",
          "cms1e7o21001xkoa013ypwf8l",
          "cms1e7o21001ykoa0fm4zajva",
        ],
      },
    },
  });
  console.log("Deleted spurious customer Notification rows:", delNotifs.count);

  // Sanity: confirm final state matches the original clean before-state (order + history count).
  const order = await prisma.order.findUnique({
    where: { id: "cms0gkmcp000vr4a00ae1g3vu" },
    select: { orderNumber: true, status: true, paymentStatus: true },
  });
  const history = await prisma.orderStatusHistory.count({ where: { orderId: "cms0gkmcp000vr4a00ae1g3vu" } });
  console.log("Post-cleanup order:", JSON.stringify(order), "history rows:", history);

  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id: "cms0htyqr0019r4a0zappitxt" },
    select: { status: true, deliveredAt: true },
  });
  console.log("Assignment (left progressed, per policy):", JSON.stringify(assignment));

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
