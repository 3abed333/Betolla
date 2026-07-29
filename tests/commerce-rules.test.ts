import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateInventoryDemand,
  periodDelta,
  recognizedRevenue,
} from "../src/lib/commerceRules";

test("inventory demand aggregates direct and bundle component demand", () => {
  const result = aggregateInventoryDemand([
    { productId: "p1", quantity: 2 },
    { productId: "p1", quantity: 3 },
    { productId: "p2", quantity: 1 },
  ]);
  assert.deepEqual(Object.fromEntries(result), { p1: 5, p2: 1 });
});

test("invalid inventory demand is rejected before stock mutation", () => {
  assert.throws(
    () => aggregateInventoryDemand([{ productId: "p1", quantity: -1 }]),
    /positive integer/,
  );
});

test("recognized revenue excludes cancelled/unpaid orders and subtracts refunds", () => {
  assert.equal(recognizedRevenue({ total: 50, refundedAmount: 10, paymentStatus: "PAID", status: "DELIVERED" }), 40);
  assert.equal(recognizedRevenue({ total: 50, refundedAmount: 0, paymentStatus: "PAID", status: "CANCELLED" }), 0);
  assert.equal(recognizedRevenue({ total: 50, refundedAmount: 0, paymentStatus: "UNPAID", status: "PENDING" }), 0);
});

test("period deltas handle a zero prior period without infinity", () => {
  assert.equal(periodDelta(0, 0), 0);
  assert.equal(periodDelta(5, 0), 100);
  assert.equal(periodDelta(15, 10), 50);
});
