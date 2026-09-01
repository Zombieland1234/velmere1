import { expect, test } from "@playwright/test";

test.describe("PASS2906 Public Status Dispute Correction", () => {
  test("API keeps status NO_GO and blocks correction without evidence", async ({ request }) => {
    const response = await request.get("/api/market-integrity/public-status-dispute-correction");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.gate).toBe("public-status-dispute-correction");
    expect(body.pass).toBe(2906);
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.correctionStatus).toBe("NO_GO_DISPUTE_CORRECTION_EVIDENCE_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canApplyCorrectionWithoutEvidence).toBe(false);
    expect(body.canSilentlyChangeCustomerStatus).toBe(false);
    expect(body.canUseCustomerDisputeAsProof).toBe(false);
  });

  test("market-integrity page exposes Shield and Real Markets dispute correction receipt selectors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator("[data-pass2906-public-status-dispute-correction-shield-target]").first()).toBeVisible();
    await expect(page.locator("[data-pass2906-public-status-dispute-correction-realmarkets-target]").first()).toBeVisible();
  });
});
