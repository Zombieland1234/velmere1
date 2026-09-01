import { expect, test } from "@playwright/test";

test.describe("PASS2899 Post-Rollback Recovery Reapproval", () => {
  test("operator API keeps production NO_GO and exposes recovery requirement set", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-rollback-recovery-reapproval");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("post-rollback-recovery-reapproval");
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.defaultRecoveryDecision).toBe("NO_GO_RECOVERY_REQUIRED");
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canOperatorApproveProduction).toBe(false);
    expect(payload.requirements.length).toBeGreaterThanOrEqual(10);
  });

  test("Shield exposes recovery reapproval selectors for fresh desktop/mobile chart receipts", async ({ page }) => {
    await page.goto("/market-integrity");
    await expect(page.locator("[data-pass2899-recovery-reapproval-shield-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2899-recovery-reapproval-shield-desktop-chart]").first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-pass2899-recovery-reapproval-shield-mobile-chart]").first()).toBeVisible();
  });

  test("Real Markets exposes recovery reapproval selectors for fresh icon/chart/no-underlay receipts", async ({ page }) => {
    await page.goto("/real-markets");
    await expect(page.locator("[data-pass2899-recovery-reapproval-realmarkets-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2899-recovery-reapproval-realmarkets-chart]").first()).toBeVisible();
  });
});
