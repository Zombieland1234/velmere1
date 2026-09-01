import { expect, test } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("PASS2896 Tamper Proof Release Ledger", () => {
  test("route exposes NO_GO ledger boundary", async ({ request }) => {
    const response = await request.get(`${base}/api/market-integrity/tamper-proof-release-ledger`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("tamper-proof-release-ledger");
    expect(payload.pass).toBe(2896);
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canOperatorApproveProduction).toBe(false);
    expect(payload.productionApprovalModeAllowed).toBe(false);
  });

  test("Shield exposes tamper-proof ledger receipt selectors", async ({ page }) => {
    await page.goto(`${base}/en/market-integrity`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-pass2896-tamper-proof-ledger-shield-target]')).toHaveCount(1);
    await expect(page.locator('[data-pass2896-tamper-proof-ledger-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2896-tamper-proof-ledger-shield-mobile-chart]').first()).toBeAttached();
  });

  test("Real Markets exposes tamper-proof ledger receipt selectors", async ({ page }) => {
    await page.goto(`${base}/en/real-markets`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-pass2896-tamper-proof-ledger-realmarkets-target]')).toHaveCount(1);
    await expect(page.locator('[data-pass2896-tamper-proof-ledger-realmarkets-chart]').first()).toBeVisible();
  });
});
