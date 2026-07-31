import "server-only";
import { Prisma, type OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { recomputeCustomerStatsForUser, confirmCodPaymentOnDelivery } from "./customerStats";
import { notify, notifyRoles } from "./notifications";

export class OrderError extends Error {}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ON_DELIVERY", "CANCELLED"],
  ON_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

type OrderNotification = {
  title: string;
  body: string;
  titleKey: string;
  bodyKey: string;
  templateParams: Record<string, string>;
};

function orderStatusNotification(
  status: OrderStatus,
  orderNumber: string,
  cancellationReason?: string | null,
): OrderNotification | null {
  switch (status) {
    case "CONFIRMED":
      return {
        title: "Order confirmed",
        body: `Your order ${orderNumber} has been confirmed and is being prepared.`,
        titleKey: "orderConfirmedTitle",
        bodyKey: "orderConfirmedBody",
        templateParams: { orderNumber },
      };
    case "ON_DELIVERY":
      return {
        title: "Order out for delivery",
        body: `Your order ${orderNumber} is on its way.`,
        titleKey: "orderOutForDeliveryTitle",
        bodyKey: "orderOutForDeliveryBody",
        templateParams: { orderNumber },
      };
    case "DELIVERED":
      return {
        title: "Order delivered",
        body: `Your order ${orderNumber} has been delivered. Enjoy!`,
        titleKey: "orderDeliveredTitle",
        bodyKey: "orderDeliveredBody",
        templateParams: { orderNumber },
      };
    case "CANCELLED":
      return {
        title: "Order cancelled",
        body: cancellationReason
          ? `Your order ${orderNumber} was cancelled: ${cancellationReason}`
          : `Your order ${orderNumber} was cancelled.`,
        titleKey: "orderCancelledTitle",
        bodyKey: "orderCancelledBody",
        templateParams: { orderNumber, reason: cancellationReason ?? "none" },
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
  const { order, updated } = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: params.orderId },
      include: {
        inventoryReservations: true,
        items: { include: { bundle: { include: { items: true } } } },
      },
    });
    if (!current) throw new OrderError("Order not found");
    if (!VALID_TRANSITIONS[current.status].includes(params.nextStatus)) {
      throw new OrderError(`Cannot move an order from ${current.status} to ${params.nextStatus}`);
    }
    if (params.nextStatus === "CANCELLED" && !params.cancellationReason?.trim()) {
      throw new OrderError("A cancellation reason is required");
    }
    if (params.nextStatus === "ON_DELIVERY" || params.nextStatus === "DELIVERED") {
      const activeAssignments = await tx.deliveryAssignment.count({
        where: { orderId: params.orderId, status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] } },
      });
      if (activeAssignments === 0) {
        throw new OrderError(
          params.nextStatus === "ON_DELIVERY"
            ? "Assign a delivery driver before starting delivery"
            : "Assign a delivery driver before marking this order delivered",
        );
      }
    }

    const changed = await tx.order.updateMany({
      where: { id: params.orderId, status: current.status },
      data: {
        status: params.nextStatus,
        cancellationReason:
          params.nextStatus === "CANCELLED"
            ? params.cancellationReason?.trim()
            : current.cancellationReason,
        ...(params.nextStatus === "CANCELLED" && current.paymentStatus === "PAID"
          ? { paymentStatus: "REFUNDED" as const, refundedAmount: current.total }
          : {}),
      },
    });
    if (changed.count !== 1) throw new OrderError("Order status changed. Refresh and try again.");

    await tx.orderStatusHistory.create({
      data: {
        orderId: params.orderId,
        status: params.nextStatus,
        note: params.nextStatus === "CANCELLED" ? params.cancellationReason?.trim() : undefined,
        changedById: params.changedById,
      },
    });

    if (params.nextStatus === "DELIVERED") {
      const deliveredAt = new Date();
      await tx.deliveryAssignment.updateMany({
        where: {
          orderId: current.id,
          status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] },
        },
        data: {
          status: "DELIVERED",
          deliveredAt,
          earningsAmount: current.shippingFee,
        },
      });
    }

    if (params.nextStatus === "CANCELLED") {
      // New orders use the immutable reservation ledger. The fallback handles older orders that
      // predate it, including bundle components rather than only direct product lines.
      const restore = new Map<string, number>();
      if (current.inventoryReservations.length > 0) {
        for (const reservation of current.inventoryReservations) {
          restore.set(reservation.productId, reservation.quantity);
        }
      } else {
        for (const item of current.items) {
          if (item.productId) {
            restore.set(item.productId, (restore.get(item.productId) ?? 0) + item.quantity);
          }
          for (const bundleItem of item.bundle?.items ?? []) {
            const quantity = bundleItem.quantity * item.quantity;
            restore.set(bundleItem.productId, (restore.get(bundleItem.productId) ?? 0) + quantity);
          }
        }
      }
      for (const [productId, quantity] of restore) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } },
        });
      }

      if (Number(current.storeCreditUsed) > 0) {
        const amount = Number(current.storeCreditUsed);
        await tx.storeCreditTransaction.create({
          data: {
            userId: current.userId,
            amount,
            reason: "Refunded - order cancelled",
            orderId: current.id,
          },
        });
        await tx.user.update({
          where: { id: current.userId },
          data: { storeCreditBalance: { increment: amount } },
        });
      }
      if (current.loyaltyPointsUsed > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: current.userId,
            type: "ADJUST",
            points: current.loyaltyPointsUsed,
            orderId: current.id,
            note: "Redemption refunded - order cancelled",
          },
        });
        await tx.user.update({
          where: { id: current.userId },
          data: { loyaltyPointsBalance: { increment: current.loyaltyPointsUsed } },
        });
      }
      if (current.loyaltyPointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: current.userId,
            type: "ADJUST",
            points: -current.loyaltyPointsEarned,
            orderId: current.id,
            note: "Earned points reversed - order cancelled",
          },
        });
        // A negative balance records points already spent elsewhere as a real liability and makes
        // future earnings pay that debt back instead of silently gifting exploitable points.
        await tx.user.update({
          where: { id: current.userId },
          data: { loyaltyPointsBalance: { decrement: current.loyaltyPointsEarned } },
        });
      }

      await tx.promoCodeUsage.deleteMany({ where: { orderId: current.id } });
      await tx.deliveryAssignment.updateMany({
        where: {
          orderId: current.id,
          status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] },
        },
        data: { status: "FAILED", failedReason: "Order cancelled" },
      });
    }

    const result = await tx.order.findUniqueOrThrow({ where: { id: params.orderId } });
    return { order: current, updated: result };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 20_000,
  });

  if (
    params.nextStatus === "DELIVERED" &&
    order.paymentMethodLabel === "Cash on Delivery" &&
    order.paymentStatus === "UNPAID"
  ) {
    await confirmCodPaymentOnDelivery(params.orderId);
  } else if (order.paymentStatus === "PAID" || params.nextStatus === "CANCELLED") {
    await recomputeCustomerStatsForUser(order.userId);
  }

  const notification = orderStatusNotification(
    params.nextStatus,
    updated.orderNumber,
    params.cancellationReason,
  );
  if (notification) {
    await notify({
      userId: order.userId,
      category: "ORDER_UPDATES",
      ...notification,
      relatedOrderId: order.id,
      eventKey: `order:${order.id}:status:${params.nextStatus}`,
    });
  }

  if (params.nextStatus === "CONFIRMED") {
    const activeAssignments = await prisma.deliveryAssignment.count({
      where: { orderId: params.orderId, status: { in: ["ASSIGNED", "PICKED_UP", "EN_ROUTE"] } },
    });
    if (activeAssignments === 0) {
      await notifyRoles(["STAFF", "ADMIN"], {
        category: "OPERATIONS",
        title: "Order confirmed without a driver",
        body: `Order ${updated.orderNumber} is confirmed but has no delivery driver assigned yet.`,
        titleKey: "orderConfirmedNoDriverTitle",
        bodyKey: "orderConfirmedNoDriverBody",
        templateParams: { orderNumber: updated.orderNumber },
        relatedOrderId: order.id,
      });
    }
  }
  return updated;
}

/**
 * Delivery may only advance a non-terminal order forward. CANCELLED/DELIVERED are immutable here,
 * and a stale delivery request can never regress them.
 */
export async function syncOrderStatusFromDelivery(orderId: string, deliveryStatus: string) {
  const nextOrderStatus: OrderStatus | null =
    deliveryStatus === "PICKED_UP" || deliveryStatus === "EN_ROUTE"
      ? "ON_DELIVERY"
      : deliveryStatus === "DELIVERED"
        ? "DELIVERED"
        : null;
  if (!nextOrderStatus) return;

  const allowedCurrent: OrderStatus[] =
    nextOrderStatus === "ON_DELIVERY" ? ["CONFIRMED"] : ["ON_DELIVERY"];
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || !allowedCurrent.includes(order.status)) return null;
    const changed = await tx.order.updateMany({
      where: { id: orderId, status: { in: allowedCurrent } },
      data: { status: nextOrderStatus },
    });
    if (changed.count !== 1) return null;
    await tx.orderStatusHistory.create({ data: { orderId, status: nextOrderStatus } });
    return order;
  });
  if (!result) return;

  if (nextOrderStatus === "DELIVERED") {
    if (result.paymentMethodLabel === "Cash on Delivery" && result.paymentStatus === "UNPAID") {
      await confirmCodPaymentOnDelivery(orderId);
    } else if (result.paymentStatus === "PAID") {
      await recomputeCustomerStatsForUser(result.userId);
    }
  }
  const notification = orderStatusNotification(nextOrderStatus, result.orderNumber);
  if (notification) {
    await notify({
      userId: result.userId,
      category: "ORDER_UPDATES",
      ...notification,
      relatedOrderId: result.id,
      eventKey: `order:${result.id}:status:${nextOrderStatus}`,
    });
  }
}
