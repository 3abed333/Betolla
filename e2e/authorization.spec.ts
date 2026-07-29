import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAs, logout, postJsonFromPage } from "./support/auth";
import { E2E_USERS } from "./support/constants";
import { getE2eFixtureIds, getFirstOrderItemId } from "./support/db";

const roleCases = [
  { user: E2E_USERS.admin, ownHome: "/admin", forbidden: "/account" },
  { user: E2E_USERS.staff, ownHome: "/staff", forbidden: "/admin" },
  { user: E2E_USERS.delivery, ownHome: "/delivery", forbidden: "/admin" },
  { user: E2E_USERS.customerA, ownHome: "/", forbidden: "/admin" },
] as const;

for (const roleCase of roleCases) {
  test(`${roleCase.user.role} is redirected away from another role's area`, async ({ page }) => {
    await loginAs(page, roleCase.user.email);
    await page.goto(roleCase.forbidden);
    await expect(page).toHaveURL(roleCase.ownHome);
  });
}

test("customer cannot read or return another customer's order", async ({ page }) => {
  const fixture = await getE2eFixtureIds();
  await loginAs(page, E2E_USERS.customerA.email);

  const checkout = await postJsonFromPage(page, "/api/checkout", {
      items: [{ kind: "product", id: fixture.productId, quantity: 1 }],
      shippingAddressId: fixture.customerAAddressId,
      paymentMethodType: "CASH_ON_DELIVERY",
      useStoreCredit: false,
      loyaltyPointsToRedeem: 0,
      idempotencyKey: randomUUID(),
  });
  expect(checkout.ok, checkout.body).toBe(true);
  const { orderId } = JSON.parse(checkout.body);

  await logout(page);
  await loginAs(page, E2E_USERS.customerB.email);

  await page.goto(`/account/orders/${orderId}`);
  await expect(page).toHaveURL("/");

  const orderItemId = await getFirstOrderItemId(orderId);
  const returnResponse = await postJsonFromPage(page, "/api/returns", {
      orderId,
      orderItemId,
      quantity: 1,
      reason: "DAMAGED",
  });
  expect(returnResponse.status).toBe(404);
});

test("only Admin can permanently delete a review - Staff and anonymous are rejected server-side", async ({ page }) => {
  // requireApiRole runs before any review lookup, so the authorization gate is provable without a
  // real review id - a STAFF/unauthenticated caller must never reach the delete logic at all.
  const anonymousDelete = await page.request.delete("/api/admin/reviews/nonexistent-id");
  expect(anonymousDelete.status()).toBe(401);

  await loginAs(page, E2E_USERS.staff.email);
  const staffDelete = await page.evaluate(async () => {
    const response = await fetch("/api/admin/reviews/nonexistent-id", { method: "DELETE" });
    return { status: response.status };
  });
  expect(staffDelete.status).toBe(403);
});
