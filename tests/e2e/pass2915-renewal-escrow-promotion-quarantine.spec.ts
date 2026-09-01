import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2915-renewal-escrow-promotion-quarantine-shield-target]";
const realMarketsTarget = "[data-pass2915-renewal-escrow-promotion-quarantine-realmarkets-target]";

test.describe("PASS2915 Renewal Escrow Promotion Quarantine", () => {
  test("renewal escrow cannot promote until independent replay is complete", async ({ page }) => {
    await page.goto("/api/market-integrity/renewal-escrow-promotion-quarantine");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("renewal-escrow-promotion-quarantine");
    expect(payload).toContain("NO_GO_RENEWAL_ESCROW_PROMOTION_QUARANTINE_REQUIRED");
    expect(payload).toContain("NO_GO_INDEPENDENT_REPLAY_REQUIRED");
    expect(payload).toContain("canAutoPromoteRenewalCandidate");
  });

  test("Shield and Real Markets expose promotion-quarantine selectors for independent replay", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
