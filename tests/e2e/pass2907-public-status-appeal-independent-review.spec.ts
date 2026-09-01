import { expect, test } from "@playwright/test";

test.describe("PASS2907 Public Status Appeal Independent Review", () => {
  test("API keeps status NO_GO and blocks appeal resolution without independent review", async ({ request }) => {
    const response = await request.get("/api/market-integrity/public-status-appeal-independent-review");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.gate).toBe("public-status-appeal-independent-review");
    expect(body.pass).toBe(2907);
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.appealStatus).toBe("NO_GO_APPEAL_INDEPENDENT_REVIEW_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canResolveAppealWithoutIndependentReview).toBe(false);
    expect(body.canUseSameOperatorForAppeal).toBe(false);
    expect(body.canSilentlyOverrideDisputeDecision).toBe(false);
    expect(body.conflictOfInterestCheckRequired).toBe(true);
  });

  test("market-integrity page exposes Shield and Real Markets appeal independent review selectors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator("[data-pass2907-public-status-appeal-review-shield-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2907-public-status-appeal-review-realmarkets-target]").first()).toBeVisible();
  });
});
