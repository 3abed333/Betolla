import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAs, postJsonFromPage } from "./support/auth";
import { E2E_PRODUCT, E2E_USERS } from "./support/constants";
import { getE2eFixtureIds, getOrderGiftDetails, getOrderPaymentMethodLabel } from "./support/db";

async function clearCustomerCart(page: Parameters<typeof loginAs>[0]) {
  const clearedCart = await postJsonFromPage(page, "/api/cart", { items: [] });
  expect(clearedCart.ok, clearedCart.body).toBe(true);
  const cartReload = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/cart") &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.reload();
  await cartReload;
}

async function openProductWithHydratedCart(page: Parameters<typeof loginAs>[0]) {
  const cartLoad = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/cart") &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.goto(`/products/${E2E_PRODUCT.slug}`);
  await cartLoad;
}

test("customer completes a Cash on Delivery checkout", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  await clearCustomerCart(page);

  await openProductWithHydratedCart(page);
  const cartSync = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/cart") &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart", { exact: true })).toBeVisible();
  await cartSync;

  await page.goto("/cart");
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await expect(page).toHaveURL("/checkout");

  await expect(page.getByRole("heading", { name: "Payment Method" })).toBeVisible();
  await expect(page.getByText("Cash on Delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("Visa", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Card (mock)", { exact: false })).toHaveCount(0);

  await page.getByRole("button", { name: "Place Order" }).click();
  await expect(page).toHaveURL(/\/checkout\/confirmation\//);
  await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
  const orderId = new URL(page.url()).pathname.split("/").at(-1);
  expect(orderId).toBeTruthy();
  expect(await getOrderPaymentMethodLabel(orderId!)).toBe("Cash on Delivery");
});

test("customer can place a gift order and see its personal details", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  await clearCustomerCart(page);

  await openProductWithHydratedCart(page);
  const cartSync = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/cart") &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await cartSync;

  await page.goto("/cart");
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await expect(page).toHaveURL("/checkout");

  await page.getByText("Send this order as a gift", { exact: true }).click();
  await page.getByRole("button", { name: "Love" }).click();
  await page.getByLabel("Gift recipient name (optional)").fill("Lina");
  await page.getByLabel("Gift message (optional)").fill("Made especially for you.");
  await page.getByRole("button", { name: "Place Order" }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmation\//);
  await expect(page.getByText("Gift order", { exact: true })).toBeVisible();
  await expect(page.getByText("A gift with love", { exact: true })).toBeVisible();
  await expect(page.getByText("Lina", { exact: false })).toBeVisible();
  await expect(page.getByText("Made especially for you.", { exact: false })).toBeVisible();

  const orderId = new URL(page.url()).pathname.split("/").at(-1);
  expect(orderId).toBeTruthy();
  expect(await getOrderGiftDetails(orderId!)).toEqual({
    isGift: true,
    giftOccasion: "LOVE",
    giftRecipientName: "Lina",
    giftMessage: "Made especially for you.",
  });
});

test("server rejects a manually forged card-payment checkout", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  const fixture = await getE2eFixtureIds();

  const response = await postJsonFromPage(page, "/api/checkout", {
      items: [{ kind: "product", id: fixture.productId, quantity: 1 }],
      shippingAddressId: fixture.customerAAddressId,
      paymentMethodType: "MOCK_CARD",
      useStoreCredit: false,
      loyaltyPointsToRedeem: 0,
      idempotencyKey: randomUUID(),
  });

  expect(response.status).toBe(400);
  expect(response.headers["x-request-id"]).toBeTruthy();
});

test("mobile checkout has no horizontal overflow", async ({ page }) => {
  await loginAs(page, E2E_USERS.customerA.email);
  await clearCustomerCart(page);
  await openProductWithHydratedCart(page);
  const cartSync = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/cart") &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart", { exact: true })).toBeVisible();
  await cartSync;
  await page.goto("/cart");
  await page.getByRole("button", { name: "Proceed to Checkout" }).click();
  await expect(page).toHaveURL("/checkout");

  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
});
