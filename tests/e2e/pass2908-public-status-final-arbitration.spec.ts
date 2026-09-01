import { expect, test } from "@playwright/test";

test.describe("PASS2908 Public Status Final Arbitration", () => {
  test("API keeps public claim NO_GO until binding final arbitration exists", async ({ request }) => {
    const response = await request.get("/api/market-integrity/public-status-final-arbitration");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2908);
    expect(body.gate).toBe("public-status-final-arbitration");
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.finalArbitrationStatus).toBe("NO_GO_FINAL_ARBITRATION_RESOLUTION_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canCloseAppealWithoutBindingResolution).toBe(false);
    expect(body.canUseUnfrozenEvidenceForFinalResolution).toBe(false);
    expect(body.canSilentlyCloseAppeal).toBe(false);
  });

  test("Shield exposes PASS2908 final arbitration receipt anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2908-public-status-final-arbitration-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2908-public-status-final-arbitration-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2908-public-status-final-arbitration-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2908 final arbitration receipt anchors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2908-public-status-final-arbitration-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2908-public-status-final-arbitration-realmarkets-chart]').first()).toBeVisible();
  });
});
