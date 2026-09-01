import { expect, test } from "@playwright/test";

test.describe("PASS2902 Production Claim Notarization", () => {
  test("API keeps production NO_GO and exposes final notary boundary", async ({ request }) => {
    const response = await request.get("/api/market-integrity/production-claim-notarization");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("production-claim-notarization");
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.defaultNotaryDecision).toBe("NO_GO_NOTARIZATION_PENDING");
    expect(payload.canIssueProductionCertificate).toBe(false);
    expect(payload.manualOverrideAllowed).toBe(false);
    expect(payload.canClaimWorldClassLive).toBe(false);
  });

  test("Shield exposes production claim notary selectors for desktop and mobile chart receipts", async ({ page }) => {
    await page.goto("/en/shield");
    await expect(page.locator('[data-pass2902-production-claim-notary-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2902-production-claim-notary-shield-desktop-chart]').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-pass2902-production-claim-notary-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes production claim notary selectors for chart and no-underlay proof", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2902-production-claim-notary-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2902-production-claim-notary-realmarkets-chart]').first()).toBeVisible();
  });
});
