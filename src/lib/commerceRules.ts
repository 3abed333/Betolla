export function recognizedRevenue(order: {
  total: number | string;
  refundedAmount: number | string;
  paymentStatus: string;
  status: string;
}) {
  if (order.paymentStatus !== "PAID" || order.status === "CANCELLED") return 0;
  return Math.max(0, Number(order.total) - Number(order.refundedAmount));
}

export function aggregateInventoryDemand(
  demands: { productId: string; quantity: number }[],
) {
  const byProduct = new Map<string, number>();
  for (const demand of demands) {
    if (!Number.isInteger(demand.quantity) || demand.quantity <= 0) {
      throw new Error("Inventory quantity must be a positive integer");
    }
    byProduct.set(demand.productId, (byProduct.get(demand.productId) ?? 0) + demand.quantity);
  }
  return byProduct;
}

export function periodDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}
