import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createReturnSchema } from "@/lib/validation/return";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let returnRequest;
  try {
    returnRequest = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: parsed.data.orderId, userId: session.userId },
        include: { items: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status !== "DELIVERED") throw new Error("ORDER_NOT_DELIVERED");
      const orderItem = order.items.find((item) => item.id === parsed.data.orderItemId);
      if (!orderItem) throw new Error("ITEM_NOT_FOUND");
      if (parsed.data.quantity > orderItem.quantity) throw new Error("QUANTITY_EXCEEDED");

      return tx.returnRequest.create({
        data: {
          orderId: order.id,
          userId: session.userId,
          statusHistory: { create: { status: "REQUESTED" } },
          items: {
            create: [{
              orderItemId: parsed.data.orderItemId,
              quantity: parsed.data.quantity,
              reason: parsed.data.reason,
              reasonNote: parsed.data.reasonNote,
            }],
          },
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ORDER_NOT_FOUND" || error.message === "ITEM_NOT_FOUND") {
        return NextResponse.json({ error: "Order item not found" }, { status: 404 });
      }
      if (error.message === "ORDER_NOT_DELIVERED") {
        return NextResponse.json({ error: "Only delivered orders can be returned" }, { status: 400 });
      }
      if (error.message === "QUANTITY_EXCEEDED") {
        return NextResponse.json({ error: "Return quantity exceeds the quantity purchased" }, { status: 400 });
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A return request already exists for this item" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ returnRequest });
}
