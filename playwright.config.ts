import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL or DATABASE_URL is required for Playwright.");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      testMatch: /checkout\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run e2e:server",
    url: `${process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100"}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      E2E_TEST_MODE: "true",
    },
  },
});
