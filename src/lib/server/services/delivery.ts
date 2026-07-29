import "server-only";
import { prisma } from "@/lib/db";
import { syncOrderStatusFromDelivery } from "./orders";
import { notifyRoles } from "./notifications";
import type { DeliveryStatus } from "@/generated/prisma/client";

export class DeliveryError extends Error {}

const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["EN_ROUTE", "FAILED"],
  EN_ROUTE: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
};

/**
 * Driver-facing status advance. Earnings are the order's shipping fee, credited only on a
 * successful DELIVERED (not on FAILED - matches the "Failed attempts" stat already shown on the
 * Staff-side driver detail page, which assumes failures don't count toward pay). A failed
 * delivery is reassigned by Admin/Staff via a *new* DeliveryAssignment row (existing
 * assign-driver route), never by resurrecting this one.
 */
export async function updateDeliveryAssignmentStatus(params: {
  assignmentId: string;
  driverId: string;
  nextStatus: DeliveryStatus;
  failedReason?: string;
}) {
  const assignment = await prisma.deliveryAssignment.findUnique({ where: { id: params.assignmentId } });
  if (!assignment) throw new DeliveryError("Delivery assignment not found");
  if (assignment.driverId !== params.driverId) throw new DeliveryError("Delivery assignment not found");

  if (!VALID_TRANSITIONS[assignment.status].includes(params.nextStatus)) {
    throw new DeliveryError(`Cannot move a delivery from ${assignment.status} to ${params.nextStatus}`);
  }
  if (params.nextStatus === "FAILED" && !params.failedReason?.trim()) {
    throw new DeliveryError("A reason is required to mark a delivery failed");
  }

  const order = await prisma.order.findUnique({ where: { id: assignment.orderId } });
  if (!order || order.status === "CANCELLED" || order.status === "DELIVERED") {
    throw new DeliveryError("This order is already in a terminal state");
  }

  const changed = await prisma.deliveryAssignment.updateMany({
    where: { id: params.assignmentId, status: assignment.status, driverId: params.driverId },
    data: {
      status: params.nextStatus,
      failedReason: params.nextStatus === "FAILED" ? params.failedReason : undefined,
      pickedUpAt: params.nextStatus === "PICKED_UP" ? new Date() : undefined,
      deliveredAt: params.nextStatus === "DELIVERED" ? new Date() : undefined,
      earningsAmount: params.nextStatus === "DELIVERED" ? (order?.shippingFee ?? 0) : undefined,
    },
  });
  if (changed.count !== 1) throw new DeliveryError("Delivery status changed. Refresh and try again.");
  const updated = await prisma.deliveryAssignment.findUniqueOrThrow({
    where: { id: params.assignmentId },
  });

  await syncOrderStatusFromDelivery(assignment.orderId, params.nextStatus);

  if (params.nextStatus === "FAILED") {
    await notifyRoles(["STAFF", "ADMIN"], {
      category: "OPERATIONS",
      title: "Delivery attempt failed",
      // Strip any trailing period(s) from the driver-supplied reason before appending the fixed
      // ". Reassign a driver." sentence - otherwise a reason that already ends in punctuation
      // (the normal case for a free-text sentence) produces a doubled ".." in the notification body.
      body: `Attempt ${assignment.attemptNumber} for order ${order?.orderNumber ?? assignment.orderId} failed${
        params.failedReason ? `: ${params.failedReason.trim().replace(/\.+$/, "")}` : ""
      }. Reassign a driver.`,
      relatedOrderId: assignment.orderId,
    });
  }

  return updated;
}
