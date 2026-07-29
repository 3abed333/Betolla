import { expect, test } from "@playwright/test";

test("health endpoint reports application and database readiness", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-request-id"]).toBeTruthy();

  const body = await response.json();
  expect(body.status).toBe("healthy");
  expect(body.checks.database).toBe("reachable");
  expect(typeof body.responseTimeMs).toBe("number");
});
