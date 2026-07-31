import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma, type ReturnStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { recomputeCustomerStatsForUser } from "@/lib/server/services/customerStats";
import { notify } from "@/lib/server/services/notifications";

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
  note: z.string().trim().max(1000).optional(),
});

const transitions: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED"],
  REJECTED: [],
  RECEIVED: ["REFUNDED"],
  REFUNDED: [],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({
        where: { id },
        include: {
          order: true,
          items: {
            include: {
              orderItem: { include: { bundle: { include: { items: true } } } },
            },
          },
        },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (!transitions[current.status].includes(parsed.data.status)) {
        throw new Error("INVALID_TRANSITION");
      }
      const refundAmount = Number(current.items.reduce(
        (sum, item) => sum + Number(item.orderItem.priceSnapshot) * item.quantity,
        0,
      ).toFixed(3));

      const changed = await tx.returnRequest.updateMany({
        where: { id, status: current.status },
        data: {
          status: parsed.data.status,
          staffNote: parsed.data.note,
          refundAmount: parsed.data.status === "REFUNDED" ? refundAmount : current.refundAmount,
          resolvedAt: ["REJECTED", "REFUNDED"].includes(parsed.data.status) ? new Date() : undefined,
        },
      });
      if (changed.count !== 1) throw new Error("STALE");
      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          status: parsed.data.status,
          note: parsed.data.note,
          changedById: session.userId,
        },
      });

      if (parsed.data.status === "RECEIVED") {
        const restore = new Map<string, number>();
        for (const item of current.items) {
          if (item.orderItem.productId) {
            restore.set(
              item.orderItem.productId,
              (restore.get(item.orderItem.productId) ?? 0) + item.quantity,
            );
          }
          for (const bundleItem of item.orderItem.bundle?.items ?? []) {
            const quantity = bundleItem.quantity * item.quantity;
            restore.set(
              bundleItem.productId,
              (restore.get(bundleItem.productId) ?? 0) + quantity,
            );
          }
        }
        for (const [productId, quantity] of restore) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } },
          });
        }
      }

      if (parsed.data.status === "REFUNDED") {
        const newRefundedAmount = Math.min(
          Number(current.order.total),
          Number(current.order.refundedAmount) + refundAmount,
        );
        await tx.order.update({
          where: { id: current.orderId },
          data: {
            refundedAmount: newRefundedAmount,
            paymentStatus:
              newRefundedAmount >= Number(current.order.total) ? "REFUNDED" : current.order.paymentStatus,
          },
        });
        if (current.refundToStoreCredit && refundAmount > 0) {
          await tx.storeCreditTransaction.create({
            data: {
              userId: current.userId,
              amount: refundAmount,
              reason: "Approved product return",
              orderId: current.orderId,
              createdById: session.userId,
            },
          });
          await tx.user.update({
            where: { id: current.userId },
            data: { storeCreditBalance: { increment: refundAmount } },
          });
        }
        const pointsToReverse = Math.floor(
          current.order.loyaltyPointsEarned *
          (refundAmount / Math.max(Number(current.order.total), 0.01)),
        );
        if (pointsToReverse > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: current.userId,
              type: "ADJUST",
              points: -pointsToReverse,
              orderId: current.orderId,
              note: "Earned points reversed - returned items",
            },
          });
          await tx.user.update({
            where: { id: current.userId },
            data: { loyaltyPointsBalance: { decrement: pointsToReverse } },
          });
        }
      }
      return { current, refundAmount };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 15_000,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }
    if (error instanceof Error && ["INVALID_TRANSITION", "STALE"].includes(error.message)) {
      return NextResponse.json({ error: "That return status transition is not allowed" }, { status: 409 });
    }
    throw error;
  }

  if (parsed.data.status === "REFUNDED") {
    await recomputeCustomerStatsForUser(result.current.userId);
  }
  await notify({
    userId: result.current.userId,
    category: "ORDER_UPDATES",
    title: "Return updated",
    body: `Your return for order ${result.current.order.orderNumber} is now ${parsed.data.status.toLowerCase()}.`,
    titleKey: "returnUpdatedTitle",
    bodyKey: "returnUpdatedBody",
    templateParams: { orderNumber: result.current.order.orderNumber, status: parsed.data.status.toLowerCase() },
    relatedOrderId: result.current.orderId,
  });
  return NextResponse.json({ ok: true, status: parsed.data.status, refundAmount: result.refundAmount });
}
