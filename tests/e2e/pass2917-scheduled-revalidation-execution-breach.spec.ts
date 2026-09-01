import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2917-scheduled-revalidation-execution-breach-shield-target]";
const realMarketsTarget = "[data-pass2917-scheduled-revalidation-execution-breach-realmarkets-target]";

test.describe("PASS2917 Scheduled Revalidation Execution Breach", () => {
  test("missed scheduled revalidation downgrades public trust and blocks green status", async ({ page }) => {
    await page.goto("/api/market-integrity/scheduled-revalidation-execution-breach");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("scheduled-revalidation-execution-breach");
    expect(payload).toContain("NO_GO_SCHEDULED_REVALIDATION_EXECUTION_REQUIRED");
    expect(payload).toContain("NO_GO_REVALIDATION_BREACH_AUTO_DOWNGRADE_REQUIRED");
    expect(payload).toContain("canUseOldFinalSealAsCurrentProof");
  });

  test("Shield and Real Markets expose scheduled revalidation breach selectors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
