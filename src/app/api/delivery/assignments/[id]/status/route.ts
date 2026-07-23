import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { updateDeliveryAssignmentStatus, DeliveryError } from "@/lib/server/services/delivery";
import { logActivity } from "@/lib/server/services/activityLog";
import type { DeliveryStatus } from "@/generated/prisma/client";

const VALID_STATUSES: DeliveryStatus[] = ["ASSIGNED", "PICKED_UP", "EN_ROUTE", "DELIVERED", "FAILED"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("DELIVERY");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const nextStatus = body.status;
  if (typeof nextStatus !== "string" || !VALID_STATUSES.includes(nextStatus as DeliveryStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await updateDeliveryAssignmentStatus({
      assignmentId: id,
      driverId: session.userId,
      nextStatus: nextStatus as DeliveryStatus,
      failedReason: typeof body.failedReason === "string" ? body.failedReason : undefined,
    });

    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "DELIVERY_STATUS_UPDATE",
      entityType: "DeliveryAssignment",
      entityId: id,
      afterData: { status: updated.status },
    });

    return NextResponse.json({ assignment: updated });
  } catch (err) {
    if (err instanceof DeliveryError) {
      // "not found" doubles as the ownership-mismatch response, same hide-existence pattern
      // used for support tickets - a driver probing another driver's assignment id shouldn't
      // learn anything from the response shape.
      const status = err.message === "Delivery assignment not found" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
