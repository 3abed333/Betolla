import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { updateOrderStatus, OrderError } from "@/lib/server/services/orders";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("CUSTOMER");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true, status: true } });
  // Never distinguish "not found" from "not yours" - both return 404 so a customer can't probe
  // for the existence of another customer's order.
  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "This order can no longer be cancelled" }, { status: 400 });
  }

  try {
    const updated = await updateOrderStatus({
      orderId: id,
      nextStatus: "CANCELLED",
      cancellationReason: "Cancelled by customer",
      changedById: session.userId,
    });
    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "ORDER_STATUS_CHANGE",
      entityType: "Order",
      entityId: id,
      afterData: { status: "CANCELLED", cancellationReason: "Cancelled by customer" },
    });
    return NextResponse.json({ order: updated });
  } catch (err) {
    // updateOrderStatus rechecks the current status inside its own transaction (optimistic
    // concurrency via updateMany), so a race against staff confirming the order - or a retried
    // request after this one already succeeded - fails here instead of double-applying stock/
    // wallet/loyalty restoration.
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
