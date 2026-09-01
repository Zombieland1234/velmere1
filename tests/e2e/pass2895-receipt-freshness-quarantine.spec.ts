import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("PASS2895 Receipt Freshness Quarantine", () => {
  test("operator gate exposes stale/copy receipt quarantine and NO_GO boundary", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/market-integrity/receipt-freshness-quarantine`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.gate).toBe("receipt-freshness-quarantine");
    expect(body.canClaimWorldClassLive).toBe(false);
    expect(body.canOperatorApproveProduction).toBe(false);
    expect(body.productionApprovalModeAllowed).toBe(false);
    expect(JSON.stringify(body.requiredReceiptRules)).toContain("quarantineIfStale");
  });

  test("Shield and Real Markets expose fresh receipt selectors for screenshot capture", async ({ page }) => {
    await page.goto(`${baseUrl}/en/market-integrity`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-pass2895-receipt-freshness-shield-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2895-receipt-freshness-realmarkets-target]").first()).toBeVisible();
  });
});
