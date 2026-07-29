import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/server/services/activityLog";
import { notify } from "@/lib/server/services/notifications";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id: orderId } = await params;

  const { driverId } = await request.json().catch(() => ({ driverId: null }));
  if (!driverId) return NextResponse.json({ error: "driverId is required" }, { status: 400 });

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const [order, driver] = await Promise.all([
        tx.order.findUnique({ where: { id: orderId } }),
        tx.user.findUnique({ where: { id: driverId } }),
      ]);
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "DELIVERED" || order.status === "CANCELLED") {
        throw new Error("ORDER_TERMINAL");
      }
      if (!driver || driver.role !== "DELIVERY" || !driver.isActive) {
        throw new Error("INVALID_DRIVER");
      }
      const [activeAssignments, previousAttempts] = await Promise.all([
        tx.deliveryAssignment.count({
          where: { orderId, status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] } },
        }),
        tx.deliveryAssignment.count({ where: { orderId } }),
      ]);
      if (activeAssignments > 0) throw new Error("ACTIVE_ASSIGNMENT");
      const assignment = await tx.deliveryAssignment.create({
        data: {
          orderId,
          driverId,
          attemptNumber: previousAttempts + 1,
          status: "ASSIGNED",
        },
      });
      if (order.status === "PENDING") {
        await tx.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "CONFIRMED" },
        });
        await tx.orderStatusHistory.create({
          data: { orderId, status: "CONFIRMED", changedById: session.userId },
        });
      }
      return { assignment, order };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 15_000,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (error.message === "ORDER_TERMINAL") {
        return NextResponse.json({ error: "A terminal order cannot be assigned" }, { status: 409 });
      }
      if (error.message === "INVALID_DRIVER") {
        return NextResponse.json({ error: "Invalid delivery driver" }, { status: 400 });
      }
      if (error.message === "ACTIVE_ASSIGNMENT") {
        return NextResponse.json({ error: "This order already has an active delivery" }, { status: 409 });
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This order already has an active delivery" }, { status: 409 });
    }
    throw error;
  }
  const { assignment, order } = result;

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_ASSIGNED",
    entityType: "Order",
    entityId: orderId,
    afterData: { driverId, attemptNumber: assignment.attemptNumber },
  });

  await notify({
    userId: driverId,
    category: "DELIVERY_ASSIGNMENTS",
    title: "New delivery assigned",
    body: `You've been assigned to deliver order ${order.orderNumber}.`,
    relatedOrderId: orderId,
  });

  return NextResponse.json({ assignment });
}
