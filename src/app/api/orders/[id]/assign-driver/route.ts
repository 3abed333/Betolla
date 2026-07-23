import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id: orderId } = await params;

  const { driverId } = await request.json().catch(() => ({ driverId: null }));
  if (!driverId) return NextResponse.json({ error: "driverId is required" }, { status: 400 });

  const [order, driver] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.user.findUnique({ where: { id: driverId } }),
  ]);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!driver || driver.role !== "DELIVERY" || !driver.isActive) {
    return NextResponse.json({ error: "Invalid delivery driver" }, { status: 400 });
  }

  const previousAttempts = await prisma.deliveryAssignment.count({ where: { orderId } });

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryAssignment.create({
      data: {
        orderId,
        driverId,
        attemptNumber: previousAttempts + 1,
        status: "ASSIGNED",
      },
    });
    if (order.status === "CONFIRMED" || order.status === "PENDING") {
      await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    }
    return created;
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_ASSIGNED",
    entityType: "Order",
    entityId: orderId,
    afterData: { driverId, attemptNumber: assignment.attemptNumber },
  });

  return NextResponse.json({ assignment });
}
