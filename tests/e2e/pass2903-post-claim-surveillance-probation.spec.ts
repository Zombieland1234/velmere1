import { expect, test } from "@playwright/test";

test.describe("PASS2903 Post Claim Surveillance Probation", () => {
  test("Shield exposes post-claim surveillance target and chart receipts", async ({ page }) => {
    await page.goto("/en/shield");
    const target = page.locator('[data-pass2903-post-claim-surveillance-shield-target="live-drift-probation-required-before-sustained-production-claim"]');
    await expect(target).toBeVisible();
    await expect(page.locator('[data-pass2903-post-claim-surveillance-shield-desktop-chart="live-drift-probation-required-for-desktop-chart-receipt"]')).toBeVisible();
    await expect(page.locator('[data-pass2903-post-claim-surveillance-shield-mobile-chart="live-drift-probation-required-for-mobile-chart-receipt"]')).toBeVisible();
  });

  test("Real Markets exposes post-claim surveillance target and no-underlay chart receipt", async ({ page }) => {
    await page.goto("/en/real-markets");
    const target = page.locator('[data-pass2903-post-claim-surveillance-realmarkets-target="live-drift-probation-required-for-icons-chart-no-underlay"]');
    await expect(target).toBeVisible();
    await expect(page.locator('[data-pass2903-post-claim-surveillance-realmarkets-chart="live-drift-probation-required-for-chart-no-underlay-receipt"]')).toBeVisible();
  });

  test("post-claim surveillance API remains NO_GO until live drift receipts exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-claim-surveillance-probation");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2903);
    expect(body.gate).toBe("post-claim-surveillance-probation");
    expect(body.defaultProductionDecision).toBe("NO_GO");
    expect(body.defaultSurveillanceDecision).toBe("NO_GO_SURVEILLANCE_PROBATION_PENDING");
    expect(body.canSustainProductionCertificate).toBe(false);
    expect(body.manualOverrideAllowed).toBe(false);
    expect(body.canClaimWorldClassLive).toBe(false);
  });
});
