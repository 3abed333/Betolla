import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createReturnSchema } from "@/lib/validation/return";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });
  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Only delivered orders can be returned" }, { status: 400 });
  }

  // The order-ownership check above only proves the *order* is the caller's - orderItemId is a
  // separate, independently-supplied id and must be verified to actually belong to that same
  // order, otherwise a customer could attach a return request (under their own, legitimately-owned
  // order) to another customer's order item by id.
  const orderItem = order.items.find((i) => i.id === parsed.data.orderItemId);
  if (!orderItem) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }
  if (parsed.data.quantity > orderItem.quantity) {
    return NextResponse.json({ error: "Return quantity exceeds the quantity purchased" }, { status: 400 });
  }

  const existing = await prisma.returnRequestItem.findFirst({
    where: { orderItemId: parsed.data.orderItemId, returnRequest: { orderId: order.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "A return request already exists for this item" }, { status: 409 });
  }

  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId: session.userId,
      items: {
        create: [
          {
            orderItemId: parsed.data.orderItemId,
            quantity: parsed.data.quantity,
            reason: parsed.data.reason,
            reasonNote: parsed.data.reasonNote,
          },
        ],
      },
    },
  });

  return NextResponse.json({ returnRequest });
}
