import "server-only";
import { prisma } from "@/lib/db";
import { recomputeCustomerStatsForUser } from "./customerStats";
import { notify } from "./notifications";
import type { OrderStatus } from "@/generated/prisma/client";

export class OrderError extends Error {}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ON_DELIVERY", "CANCELLED"],
  ON_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function orderStatusNotification(status: OrderStatus, orderNumber: string, cancellationReason?: string | null) {
  switch (status) {
    case "CONFIRMED":
      return { title: "Order confirmed", body: `Your order ${orderNumber} has been confirmed and is being prepared.` };
    case "ON_DELIVERY":
      return { title: "Order out for delivery", body: `Your order ${orderNumber} is on its way.` };
    case "DELIVERED":
      return { title: "Order delivered", body: `Your order ${orderNumber} has been delivered. Enjoy!` };
    case "CANCELLED":
      return {
        title: "Order cancelled",
        body: cancellationReason ? `Your order ${orderNumber} was cancelled: ${cancellationReason}` : `Your order ${orderNumber} was cancelled.`,
      };
    default:
      return null;
  }
}

export async function updateOrderStatus(params: {
  orderId: string;
  nextStatus: OrderStatus;
  cancellationReason?: string;
  changedById: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) throw new OrderError("Order not found");

  if (!VALID_TRANSITIONS[order.status].includes(params.nextStatus)) {
    throw new OrderError(`Cannot move an order from ${order.status} to ${params.nextStatus}`);
  }
  if (params.nextStatus === "CANCELLED" && !params.cancellationReason?.trim()) {
    throw new OrderError("A cancellation reason is required");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: params.orderId },
      data: {
        status: params.nextStatus,
        cancellationReason: params.nextStatus === "CANCELLED" ? params.cancellationReason : order.cancellationReason,
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: params.orderId,
        status: params.nextStatus,
        note: params.nextStatus === "CANCELLED" ? params.cancellationReason : undefined,
        changedById: params.changedById,
      },
    });
    // Cancelling restores stock that was reserved at checkout.
    if (params.nextStatus === "CANCELLED") {
      const items = await tx.orderItem.findMany({ where: { orderId: params.orderId } });
      for (const item of items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }
    return result;
  });

  if (order.paymentStatus === "PAID") {
    await recomputeCustomerStatsForUser(order.userId);
  }

  const notification = orderStatusNotification(params.nextStatus, updated.orderNumber, params.cancellationReason);
  if (notification) {
    await notify({ userId: order.userId, category: "ORDER_UPDATES", ...notification, relatedOrderId: order.id });
  }

  return updated;
}

/**
 * The single place DeliveryAssignment status and Order status are kept in sync (see the
 * schema's documented design) - called whenever a delivery status changes, from either the
 * delivery driver's own dashboard or admin/staff order tools.
 */
export async function syncOrderStatusFromDelivery(orderId: string, deliveryStatus: string) {
  const nextOrderStatus: OrderStatus | null =
    deliveryStatus === "PICKED_UP" || deliveryStatus === "EN_ROUTE"
      ? "ON_DELIVERY"
      : deliveryStatus === "DELIVERED"
        ? "DELIVERED"
        : null; // FAILED: admin/staff decide the next step manually (reassign or cancel)

  if (!nextOrderStatus) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === nextOrderStatus) return;

  await prisma.order.update({ where: { id: orderId }, data: { status: nextOrderStatus } });
  await prisma.orderStatusHistory.create({ data: { orderId, status: nextOrderStatus } });

  if (nextOrderStatus === "DELIVERED" && order.paymentStatus === "PAID") {
    await recomputeCustomerStatsForUser(order.userId);
  }

  const notification = orderStatusNotification(nextOrderStatus, order.orderNumber);
  if (notification) {
    await notify({ userId: order.userId, category: "ORDER_UPDATES", ...notification, relatedOrderId: order.id });
  }
}
