import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2914-public-trust-evidence-decay-shield-target]";
const realMarketsTarget = "[data-pass2914-public-trust-evidence-decay-realmarkets-target]";

test.describe("PASS2914 Public Trust Evidence Decay", () => {
  test("public trust cannot be sustained when evidence age renewal escrow is missing", async ({ page }) => {
    await page.goto("/api/market-integrity/public-trust-evidence-decay-renewal-escrow");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("public-trust-evidence-decay-renewal-escrow");
    expect(payload).toContain("NO_GO_PUBLIC_TRUST_EVIDENCE_DECAY_RENEWAL_REQUIRED");
    expect(payload).toContain("NO_GO_RENEWAL_ESCROW_REQUIRED");
    expect(payload).toContain("canAutoRenewPublicTrust");
  });

  test("Shield and Real Markets expose evidence-decay selectors for renewal receipts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
