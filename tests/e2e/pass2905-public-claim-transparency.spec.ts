import { expect, test } from "@playwright/test";

test.describe("PASS2905 Public Claim Transparency", () => {
  test("public status API stays NO_GO until customer-visible receipts are green", async ({ request }) => {
    const response = await request.get("/api/market-integrity/public-claim-transparency");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.gate).toBe("public-claim-transparency");
    expect(body.publicClaimStatus).toBe("NO_GO_PUBLIC_RECEIPTS_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canHideMissingReceiptsFromCustomer).toBe(false);
    expect(body.canUseMarketingCopyAsProof).toBe(false);
  });

  test("Shield exposes public claim transparency selectors for receipts", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2905-public-claim-transparency-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2905-public-claim-transparency-shield-desktop-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes public claim transparency selectors for icons/chart/no-underlay", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2905-public-claim-transparency-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2905-public-claim-transparency-realmarkets-chart]').first()).toBeVisible();
  });
});
