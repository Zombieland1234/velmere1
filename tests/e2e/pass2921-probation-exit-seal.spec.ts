import { test, expect } from "@playwright/test";

test.describe("PASS2921 Probation Exit Seal", () => {
  test("Shield and Real Markets expose probation exit evidence hooks", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2921-probation-exit-seal-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2921-probation-exit-seal-shield-desktop-chart]')).toBeVisible();
    await expect(page.locator('[data-pass2921-probation-exit-seal-shield-mobile-chart]')).toBeVisible();
    await expect(page.locator('[data-pass2921-probation-exit-seal-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2921-probation-exit-seal-realmarkets-chart]')).toBeVisible();
  });

  test("API keeps probation exit seal fail-closed", async ({ request }) => {
    const response = await request.get("/api/market-integrity/probation-exit-seal");
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.gate).toBe("probation-exit-seal");
    expect(json.probationExitSealStatus).toBe("NO_GO_PROBATION_EXIT_SEAL_REQUIRED");
    expect(json.canExitProbationWithoutSustainedReceipts).toBe(false);
    expect(json.canShowGreenProductionBadge).toBe(false);
  });
});
