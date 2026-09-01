import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("PASS2894 Operator GO/NO-GO", () => {
  test("operator gate blocks production GO without complete receipts", async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/market-integrity/operator-go-no-go`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("operator-go-no-go");
    expect(payload.defaultApprovalMode).toBe("NO_GO");
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canOperatorApproveProduction).toBe(false);
    expect(payload.requiredReceipts).toContain("operator_signed_go_no_go_json");
  });

  test("Shield has operator GO/NO-GO target selectors for rows and chart receipts", async ({ page }) => {
    await page.goto(`${baseUrl}/en/market-integrity`, { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-pass2894-operator-go-no-go-shield-target]').first();
    await expect(target).toBeVisible();
    await expect(page.locator('[data-pass2894-operator-go-no-go-shield-desktop-chart]').first()).toBeVisible();
  });

  test("Real Markets has operator GO/NO-GO target selectors for icon and chart receipts", async ({ page }) => {
    await page.goto(`${baseUrl}/en/market-integrity`, { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-pass2894-operator-go-no-go-realmarkets-target]').first();
    await expect(target).toBeVisible();
    await expect(page.locator('[data-pass2894-operator-go-no-go-realmarkets-chart]').first()).toBeVisible();
  });
});
