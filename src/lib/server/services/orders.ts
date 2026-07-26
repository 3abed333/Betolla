import "server-only";
import { prisma } from "@/lib/db";
import { recomputeCustomerStatsForUser, confirmCodPaymentOnDelivery } from "./customerStats";
import { notify, notifyRoles } from "./notifications";
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
  // A driver must be actively assigned before an order can be sent out for delivery or marked
  // delivered - checked on both transitions since a FAILED assignment leaves Order.status at
  // ON_DELIVERY (see syncOrderStatusFromDelivery below), which would otherwise let staff push
  // straight to DELIVERED with no active driver.
  if (params.nextStatus === "ON_DELIVERY" || params.nextStatus === "DELIVERED") {
    const activeAssignments = await prisma.deliveryAssignment.count({
      where: { orderId: params.orderId, status: { not: "FAILED" } },
    });
    if (activeAssignments === 0) {
      throw new OrderError(
        params.nextStatus === "ON_DELIVERY"
          ? "Assign a delivery driver before starting delivery"
          : "Assign a delivery driver before marking this order delivered",
      );
    }
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
    // Cancelling restores stock that was reserved at checkout, and reverses any wallet balance the
    // customer spent on an order that never actually completed - same reasoning for both: an order
    // that's cancelled shouldn't leave the customer permanently out the store credit/points they
    // put toward it, matching how a refunded payment would be reversed.
    if (params.nextStatus === "CANCELLED") {
      const items = await tx.orderItem.findMany({ where: { orderId: params.orderId } });
      for (const item of items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
      if (Number(order.storeCreditUsed) > 0) {
        await tx.storeCreditTransaction.create({
          data: { userId: order.userId, amount: Number(order.storeCreditUsed), reason: "Refunded - order cancelled", orderId: order.id },
        });
        await tx.user.update({ where: { id: order.userId }, data: { storeCreditBalance: { increment: Number(order.storeCreditUsed) } } });
      }
      if (order.loyaltyPointsUsed > 0) {
        await tx.loyaltyTransaction.create({
          data: { userId: order.userId, type: "ADJUST", points: order.loyaltyPointsUsed, orderId: order.id, note: "Refunded - order cancelled" },
        });
        await tx.user.update({ where: { id: order.userId }, data: { loyaltyPointsBalance: { increment: order.loyaltyPointsUsed } } });
      }
    }
    return result;
  });

  // A Cash-on-Delivery order reaching DELIVERED is this business's payment-confirmation event
  // (cash changes hands at the door) - see confirmCodPaymentOnDelivery's docstring. Any other
  // already-PAID order still gets its stats recomputed on every transition, as before.
  if (params.nextStatus === "DELIVERED" && order.paymentMethodLabel === "Cash on Delivery" && order.paymentStatus === "UNPAID") {
    await confirmCodPaymentOnDelivery(params.orderId);
  } else if (order.paymentStatus === "PAID") {
    await recomputeCustomerStatsForUser(order.userId);
  }

  const notification = orderStatusNotification(params.nextStatus, updated.orderNumber, params.cancellationReason);
  if (notification) {
    await notify({ userId: order.userId, category: "ORDER_UPDATES", ...notification, relatedOrderId: order.id });
  }

  // Staff/Admin operational alert: a driver still needs to be assigned. In practice this branch
  // is rarely reached with zero assignments - assigning a driver to a PENDING/CONFIRMED order
  // bumps Order.status to CONFIRMED directly (see assign-driver/route.ts) without going through
  // this function - but the check is kept as a real correctness guard, not dead code, in case
  // that other path ever changes.
  if (params.nextStatus === "CONFIRMED") {
    const activeAssignments = await prisma.deliveryAssignment.count({
      where: { orderId: params.orderId, status: { not: "FAILED" } },
    });
    if (activeAssignments === 0) {
      await notifyRoles(["STAFF", "ADMIN"], {
        category: "OPERATIONS",
        title: "Order confirmed without a driver",
        body: `Order ${updated.orderNumber} is confirmed but has no delivery driver assigned yet.`,
        relatedOrderId: order.id,
      });
    }
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

  if (nextOrderStatus === "DELIVERED") {
    if (order.paymentMethodLabel === "Cash on Delivery" && order.paymentStatus === "UNPAID") {
      await confirmCodPaymentOnDelivery(orderId);
    } else if (order.paymentStatus === "PAID") {
      await recomputeCustomerStatsForUser(order.userId);
    }
  }

  const notification = orderStatusNotification(nextOrderStatus, order.orderNumber);
  if (notification) {
    await notify({ userId: order.userId, category: "ORDER_UPDATES", ...notification, relatedOrderId: order.id });
  }
}
