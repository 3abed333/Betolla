import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const drivers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  console.log("=== Drivers ===");
  console.log(JSON.stringify(drivers, null, 2));

  for (const d of drivers) {
    const assignments = await prisma.deliveryAssignment.findMany({
      where: { driverId: d.id },
      select: {
        id: true,
        status: true,
        attemptNumber: true,
        orderId: true,
        order: { select: { orderNumber: true, paymentMethodLabel: true, total: true, status: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    const active = assignments.filter((a) => ["ASSIGNED", "PICKED_UP", "EN_ROUTE"].includes(a.status));
    const terminal = assignments.filter((a) => ["DELIVERED", "FAILED"].includes(a.status));
    console.log(
      `\n=== ${d.firstName} ${d.lastName} (${d.id}) - ${assignments.length} total, ${active.length} active, ${terminal.length} terminal ===`,
    );
    console.log("Active:", JSON.stringify(active, null, 2));
  }

  console.log("\n=== Existing DeliverySupportTicket rows ===");
  const reports = await prisma.deliverySupportTicket.findMany({
    select: { id: true, driverId: true, problemType: true, status: true, photoUrl: true, deliveryAssignmentId: true },
  });
  console.log(JSON.stringify(reports, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
