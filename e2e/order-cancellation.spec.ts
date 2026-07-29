import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAs, logout, postJsonFromPage } from "./support/auth";
import { E2E_USERS } from "./support/constants";
import { getE2eFixtureIds, getOrderStatus, forceOrderStatus, getProductStock } from "./support/db";

async function placePendingOrder(page: Parameters<typeof loginAs>[0]) {
  const fixture = await getE2eFixtureIds();
  const response = await postJsonFromPage(page, "/api/checkout", {
    items: [{ kind: "product", id: fixture.productId, quantity: 1 }],
    shippingAddressId: fixture.customerAAddressId,
    paymentMethodType: "CASH_ON_DELIVERY",
    useStoreCredit: false,
    loyaltyPointsToRedeem: 0,
    idempotencyKey: randomUUID(),
  });
  expect(response.ok, response.body).toBe(true);
  const { orderId } = JSON.parse(response.body) as { orderId: string };
  return { orderId, productId: fixture.productId };
}

async function cancel(page: Parameters<typeof loginAs>[0], orderId: string) {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/account/orders/${id}/cancel`, { method: "POST" });
    return { status: res.status, body: await res.text() };
  }, orderId);
}

test("the owner can cancel their own PENDING order, restoring stock exactly once", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  const { orderId, productId } = await placePendingOrder(page);
  const stockAfterOrder = await getProductStock(productId);

  const first = await cancel(page, orderId);
  expect(first.status, first.body).toBe(200);
  expect(await getOrderStatus(orderId)).toBe("CANCELLED");
  const stockAfterCancel = await getProductStock(productId);
  expect(stockAfterCancel).toBe(stockAfterOrder + 1);

  // Retrying the already-cancelled order must fail, not double-restore stock.
  const second = await cancel(page, orderId);
  expect(second.status).toBe(400);
  expect(await getProductStock(productId)).toBe(stockAfterCancel);
});

test("a different customer cannot cancel someone else's order", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  const { orderId } = await placePendingOrder(page);
  await logout(page);

  await loginAs(page, E2E_USERS.customerB.email);
  const response = await cancel(page, orderId);
  expect(response.status).toBe(404);
  expect(await getOrderStatus(orderId)).toBe("PENDING");
});

test("unauthenticated requests cannot cancel an order", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  const { orderId } = await placePendingOrder(page);
  await logout(page);

  const response = await cancel(page, orderId);
  expect(response.status).toBe(401);
  expect(await getOrderStatus(orderId)).toBe("PENDING");
});

test("a CONFIRMED order can no longer be customer-cancelled", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  const { orderId } = await placePendingOrder(page);
  await forceOrderStatus(orderId, "CONFIRMED");

  const response = await cancel(page, orderId);
  expect(response.status).toBe(400);
  expect(await getOrderStatus(orderId)).toBe("CONFIRMED");
});
