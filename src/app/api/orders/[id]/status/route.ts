import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/api-guard";
import { updateOrderStatus, OrderError } from "@/lib/server/services/orders";
import { logActivity } from "@/lib/server/services/activityLog";

const schema = z.object({
  status: z.enum(["CONFIRMED", "ON_DELIVERY", "DELIVERED", "CANCELLED"]),
  cancellationReason: z.string().trim().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const order = await updateOrderStatus({
      orderId: id,
      nextStatus: parsed.data.status,
      cancellationReason: parsed.data.cancellationReason,
      changedById: session.userId,
    });
    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "ORDER_STATUS_CHANGE",
      entityType: "Order",
      entityId: id,
      afterData: { status: parsed.data.status, cancellationReason: parsed.data.cancellationReason },
    });
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
