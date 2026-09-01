import { expect, test } from "@playwright/test";

test.describe("PASS2904 Claim Expiry Renewal", () => {
  test("API keeps production renewal blocked without fresh CI artifacts", async ({ request }) => {
    const response = await request.get("/api/market-integrity/claim-expiry-renewal");
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.pass).toBe(2904);
    expect(json.gate).toBe("claim-expiry-renewal");
    expect(json.productionDecision).toBe("NO_GO");
    expect(json.renewalDecision).toBe("NO_GO_RENEWAL_ARTIFACTS_REQUIRED");
    expect(json.canRenewProductionClaimNow).toBe(false);
    expect(json.manualOverrideAllowed).toBe(false);
  });

  test("Shield exposes PASS2904 renewal selectors", async ({ page }) => {
    await page.goto("/en/shield");
    await expect(page.locator('[data-pass2904-claim-expiry-renewal-shield-target="claim-expires-renewal-requires-fresh-ci-browser-pdf-payment-provider-receipts"]')).toBeVisible();
    await expect(page.locator('[data-pass2904-claim-expiry-renewal-shield-desktop-chart="fresh-ci-playwright-desktop-chart-receipt-required-for-renewal"]').first()).toBeVisible();
    await expect(page.locator('[data-pass2904-claim-expiry-renewal-shield-mobile-chart="fresh-ci-playwright-mobile-chart-receipt-required-for-renewal"]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2904 renewal selectors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2904-claim-expiry-renewal-realmarkets-target="claim-expires-renewal-requires-fresh-icons-chart-no-underlay-ci-receipts"]')).toBeVisible();
    await expect(page.locator('[data-pass2904-claim-expiry-renewal-realmarkets-chart="fresh-ci-playwright-chart-no-underlay-receipt-required-for-renewal"]').first()).toBeVisible();
  });
});
