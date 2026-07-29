import { expect, test } from "@playwright/test";
import { logout } from "./support/auth";
import { E2E_PASSWORD, E2E_USERS } from "./support/constants";

test("customer can register, log out, and log back in", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-register-${unique}@betolla.test`;
  const username = `e2e_${unique}`.slice(0, 28);
  const password = "Fresh-E2E-Password-123!";

  await page.goto("/register");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Registration");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("I have read and accept the").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/");

  await logout(page);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();
});

test("invalid login is rejected without revealing whether an account exists", async ({ request }) => {
  const response = await request.post("/api/auth/login", {
    data: { email: "not-a-real-account@betolla.test", password: "Wrong-Password-123!" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["x-request-id"]).toBeTruthy();
  expect(await response.json()).toEqual({ error: "Incorrect email or password" });
});

test("password forms never put credentials in the URL when JavaScript is unavailable", async ({
  browser,
  baseURL,
}) => {
  expect(baseURL).toBeTruthy();
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  const requests: { method: string; url: string }[] = [];
  page.on("request", (request) => {
    requests.push({ method: request.method(), url: request.url() });
  });

  try {
    await page.goto("/register");
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.locator("form")).toHaveAttribute("action", "/api/auth/register");

    await page.goto("/login");
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.locator("form")).toHaveAttribute("action", "/api/auth/login");
    await page.getByLabel("Email").fill(E2E_USERS.customerA.email);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/change-password");
    await expect(page.locator("form")).toHaveAttribute("method", "post");
    await expect(page.locator("form")).toHaveAttribute("action", "/api/auth/change-password");

    const loginRequest = requests.find((request) => request.url.endsWith("/api/auth/login"));
    expect(loginRequest?.method).toBe("POST");
    for (const request of requests) {
      const url = new URL(request.url);
      expect(url.searchParams.has("email")).toBe(false);
      expect(url.searchParams.has("password")).toBe(false);
      expect(decodeURIComponent(request.url)).not.toContain(E2E_PASSWORD);
    }
  } finally {
    await context.close();
  }
});
