import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db";
import { rateDeliverySchema } from "@/lib/validation/deliveryRating";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("CUSTOMER");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = rateDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const assignment = await prisma.deliveryAssignment.findUnique({
    where: { id },
    include: { order: { select: { userId: true } } },
  });
  // Same hide-existence pattern as the driver-facing status route: a customer probing another
  // customer's assignment id learns nothing from the response shape.
  if (!assignment || assignment.order.userId !== session.userId) {
    return NextResponse.json({ error: "Delivery assignment not found" }, { status: 404 });
  }
  if (assignment.status !== "DELIVERED") {
    return NextResponse.json({ error: "You can only rate a completed delivery" }, { status: 400 });
  }
  if (assignment.rating !== null) {
    return NextResponse.json({ error: "You already rated this delivery" }, { status: 400 });
  }

  const updated = await prisma.deliveryAssignment.update({
    where: { id },
    data: { rating: parsed.data.rating, comment: parsed.data.comment },
  });

  return NextResponse.json({ assignment: { id: updated.id, rating: updated.rating, comment: updated.comment } });
}
