import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2916-renewal-promotion-final-seal-shield-target]";
const realMarketsTarget = "[data-pass2916-renewal-promotion-final-seal-realmarkets-target]";

test.describe("PASS2916 Renewal Promotion Final Seal", () => {
  test("independent replay cannot restore until final seal, dual-control vote and scheduled revalidation exist", async ({ page }) => {
    await page.goto("/api/market-integrity/renewal-promotion-final-seal");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("renewal-promotion-final-seal");
    expect(payload).toContain("NO_GO_RENEWAL_PROMOTION_FINAL_SEAL_REQUIRED");
    expect(payload).toContain("NO_GO_DUAL_CONTROL_RESTORE_VOTE_REQUIRED");
    expect(payload).toContain("canUseIndependentReplayAsFinalSeal");
  });

  test("Shield and Real Markets expose final-seal selectors for restore candidate revalidation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
