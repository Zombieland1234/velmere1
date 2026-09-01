import { test, expect } from "@playwright/test";

test.describe("PASS2922 Post-Graduation Public Restore Seal", () => {
  test("API remains fail-closed until public restore seal and long-term surveillance handoff exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-graduation-public-restore-seal");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.gate).toBe("post-graduation-public-restore-seal");
    expect(body.postGraduationPublicRestoreSealStatus).toBe("NO_GO_POST_GRADUATION_PUBLIC_RESTORE_SEAL_REQUIRED");
    expect(body.longTermSurveillanceHandoffStatus).toBe("NO_GO_LONG_TERM_SURVEILLANCE_HANDOFF_REQUIRED");
    expect(body.canPublishRestoredStatusWithoutPublicSeal).toBe(false);
    expect(body.canShowGreenProductionBadge).toBe(false);
  });

  test("Shield and Real Markets expose PASS2922 receipt anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2922-post-graduation-public-restore-seal-shield-target]').first()).toBeVisible();
    await expect(page.locator('[data-pass2922-post-graduation-public-restore-seal-realmarkets-target]').first()).toBeVisible();
  });
});
