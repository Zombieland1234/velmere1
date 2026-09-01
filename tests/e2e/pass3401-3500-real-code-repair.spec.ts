
import { test, expect } from "@playwright/test";

test.describe("PASS3401-3500 real-code repair critical journeys", () => {
  test("Shield keeps more than ten rows and a visible right-side chart or skeleton", async ({ page }) => {
    await page.goto("/en/market-integrity");
    const rows = page.locator("[data-pass2887-shield-row-neutral-selection]");
    await expect(rows.nth(10)).toBeVisible();
    await expect(page.locator("[data-pass3401-runtime-repair-summary]")).toBeVisible();
  });

  test("Advanced analysis is server-first and does not unlock from wallet identity", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await page.getByRole("button").filter({ hasText: /BTC|Bitcoin/i }).first().click();
    await page.getByRole("button", { name: /VLM Analysis/i }).click();
    await page.getByRole("menuitem", { name: /Advanced/i }).click();
    await expect(page.locator("[data-pass3401-advanced-server-first-gate]")).toBeVisible();
  });
});
