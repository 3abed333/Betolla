import { expect, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

export async function postJsonFromPage(page: Page, path: string, data?: unknown) {
  return page.evaluate(
    async ({ requestPath, requestData }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestData === undefined ? undefined : JSON.stringify(requestData),
      });
      return {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    },
    { requestPath: path, requestData: data },
  );
}

export async function loginAs(page: Page, email: string, password = E2E_PASSWORD) {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  const responseBody = await response.text();
  expect(response.ok(), responseBody).toBe(true);
  expect(response.headers()["x-request-id"]).toBeTruthy();
  const { redirectTo } = JSON.parse(responseBody) as { redirectTo: string };
  const initialCartLoad =
    redirectTo === "/"
      ? page.waitForResponse(
          (cartResponse) =>
            cartResponse.url().endsWith("/api/cart") &&
            cartResponse.request().method() === "GET" &&
            cartResponse.ok(),
        )
      : null;
  await page.goto(redirectTo);
  await initialCartLoad;
}

export async function logout(page: Page) {
  const response = await postJsonFromPage(page, "/api/auth/logout");
  expect(response.ok, response.body).toBe(true);
}
