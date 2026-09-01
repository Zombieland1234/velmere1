import { expect, test } from "@playwright/test";

test.describe("PASS2898 Release Revocation Rollback Sentinel", () => {
  test("operator API keeps production NO_GO and exposes revocation trigger set", async ({ request }) => {
    const response = await request.get("/api/market-integrity/release-revocation-rollback-sentinel");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("release-revocation-rollback-sentinel");
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.defaultRevocationDecision).toBe("REVOKE_IF_ANY_TRIGGER");
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canOperatorApproveProduction).toBe(false);
    expect(payload.revocationTriggers.length).toBeGreaterThanOrEqual(10);
  });

  test("Shield exposes revocation sentinel selectors for rows and desktop/mobile chart receipts", async ({ page }) => {
    await page.goto("/market-integrity");
    await expect(page.locator("[data-pass2898-revocation-sentinel-shield-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2898-revocation-sentinel-shield-desktop-chart]").first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-pass2898-revocation-sentinel-shield-mobile-chart]").first()).toBeVisible();
  });

  test("Real Markets exposes revocation sentinel selectors for icon/chart/no-underlay receipts", async ({ page }) => {
    await page.goto("/real-markets");
    await expect(page.locator("[data-pass2898-revocation-sentinel-realmarkets-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2898-revocation-sentinel-realmarkets-chart]").first()).toBeVisible();
  });
});
