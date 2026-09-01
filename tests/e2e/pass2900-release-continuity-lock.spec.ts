import { expect, test } from "@playwright/test";

test.describe("PASS2900 Release Continuity Lock", () => {
  test("API keeps production NO_GO and exposes continuity lineage boundary", async ({ request }) => {
    const response = await request.get("/api/market-integrity/release-continuity-lock");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("release-continuity-lock");
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.defaultContinuityDecision).toBe("NO_GO_CONTINUITY_LOCKED");
    expect(payload.autoRestoreGoAfterRecoveryAllowed).toBe(false);
    expect(payload.canClaimWorldClassLive).toBe(false);
  });

  test("Shield exposes continuity selectors for desktop and mobile chart receipts", async ({ page }) => {
    await page.goto("/en/shield");
    await expect(page.locator('[data-pass2900-release-continuity-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2900-release-continuity-shield-desktop-chart]').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-pass2900-release-continuity-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes continuity selectors for chart and no-underlay proof", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2900-release-continuity-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2900-release-continuity-realmarkets-chart]').first()).toBeVisible();
  });
});
