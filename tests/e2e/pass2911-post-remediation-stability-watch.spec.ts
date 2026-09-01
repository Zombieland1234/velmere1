import { expect, test } from "@playwright/test";

test.describe("PASS2911 Post-Remediation Stability Watch", () => {
  test("API keeps stability watch NO_GO until post-closure receipts and relapse sentinel exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-remediation-stability-watch");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2911);
    expect(body.gate).toBe("post-remediation-stability-watch");
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.postRemediationStabilityStatus).toBe("NO_GO_POST_REMEDIATION_STABILITY_WATCH_REQUIRED");
    expect(body.relapseSentinelStatus).toBe("NO_GO_RELAPSE_SENTINEL_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canKeepCustomerCaseClosed).toBe(false);
    expect(body.canTreatClosureAsPermanent).toBe(false);
    expect(body.canUseOldPostPatchRetestAsStabilityProof).toBe(false);
  });

  test("Shield exposes PASS2911 post-remediation stability watch anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2911-post-remediation-stability-watch-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2911-post-remediation-stability-watch-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2911-post-remediation-stability-watch-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2911 post-remediation stability watch anchors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2911-post-remediation-stability-watch-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2911-post-remediation-stability-watch-realmarkets-chart]').first()).toBeVisible();
  });
});
