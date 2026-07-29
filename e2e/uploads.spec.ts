import { unlink } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAs } from "./support/auth";
import { E2E_USERS } from "./support/constants";
import { clearE2eUploadQuotaForEmail } from "./support/db";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("an image uploaded after the production build is immediately publicly readable", async ({ page }) => {
  await loginAs(page, E2E_USERS.admin.email);
  let savedUrl: string | null = null;

  try {
    const upload = await page.evaluate(async (imageBase64) => {
      const binary = atob(imageBase64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const formData = new FormData();
      formData.append("subfolder", "popups");
      formData.append("file", new File([bytes], "runtime-popup.png", { type: "image/png" }));
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      return { status: response.status, body: await response.text() };
    }, ONE_PIXEL_PNG.toString("base64"));
    expect(upload.status, upload.body).toBe(200);
    const body = JSON.parse(upload.body) as { url: string };
    savedUrl = body.url;
    expect(savedUrl).toMatch(/^\/uploads\/popups\/[a-f0-9-]+\.webp$/);

    const served = await page.request.get(savedUrl);
    expect(served.status()).toBe(200);
    expect(served.headers()["content-type"]).toBe("image/webp");
    expect(served.headers()["cache-control"]).toContain("immutable");
    expect((await served.body()).length).toBeGreaterThan(0);
  } finally {
    if (savedUrl) {
      await unlink(path.join(process.cwd(), "public", savedUrl)).catch(() => undefined);
    }
    await clearE2eUploadQuotaForEmail(E2E_USERS.admin.email);
  }
});
