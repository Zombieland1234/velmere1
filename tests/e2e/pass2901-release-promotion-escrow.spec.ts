import { expect, test } from "@playwright/test";

test.describe("PASS2901 Release Promotion Escrow", () => {
  test("API keeps production NO_GO and exposes promotion escrow boundary", async ({ request }) => {
    const response = await request.get("/api/market-integrity/release-promotion-escrow");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("release-promotion-escrow");
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.defaultPromotionDecision).toBe("NO_GO_PROMOTION_ESCROW_PENDING");
    expect(payload.canPromoteToGoCandidate).toBe(false);
    expect(payload.canClaimWorldClassLive).toBe(false);
  });

  test("Shield exposes promotion escrow selectors for desktop and mobile chart receipts", async ({ page }) => {
    await page.goto("/en/shield");
    await expect(page.locator('[data-pass2901-release-promotion-escrow-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2901-release-promotion-escrow-shield-desktop-chart]').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-pass2901-release-promotion-escrow-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes promotion escrow selectors for chart and no-underlay proof", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2901-release-promotion-escrow-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2901-release-promotion-escrow-realmarkets-chart]').first()).toBeVisible();
  });
});
