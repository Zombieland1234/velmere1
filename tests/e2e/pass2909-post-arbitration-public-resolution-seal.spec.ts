import { expect, test } from "@playwright/test";

test.describe("PASS2909 Post-Arbitration Public Resolution Seal", () => {
  test("API keeps public status NO_GO until public resolution seal and retests exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-arbitration-public-resolution-seal");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2909);
    expect(body.gate).toBe("post-arbitration-public-resolution-seal");
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.postArbitrationPublicationStatus).toBe("NO_GO_PUBLIC_RESOLUTION_SEAL_REQUIRED");
    expect(body.remediationStatus).toBe("NO_GO_REMEDIATION_RETEST_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canPublishResolutionWithoutPrivateDigestMatch).toBe(false);
    expect(body.canCloseRemediationWithoutRetest).toBe(false);
    expect(body.canRewriteCustomerHistory).toBe(false);
  });

  test("Shield exposes PASS2909 post-arbitration public resolution anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2909-post-arbitration-public-resolution-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2909-post-arbitration-public-resolution-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2909-post-arbitration-public-resolution-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2909 post-arbitration public resolution anchors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2909-post-arbitration-public-resolution-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2909-post-arbitration-public-resolution-realmarkets-chart]').first()).toBeVisible();
  });
});
