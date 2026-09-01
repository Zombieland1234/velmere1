import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2918-downgrade-recovery-escrow-shield-target]";
const realMarketsTarget = "[data-pass2918-downgrade-recovery-escrow-realmarkets-target]";

test.describe("PASS2918 Downgrade Recovery Escrow", () => {
  test("downgrade recovery requires customer notice reopen and fresh escrow receipts", async ({ page }) => {
    await page.goto("/api/market-integrity/downgrade-recovery-escrow");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("downgrade-recovery-escrow");
    expect(payload).toContain("NO_GO_DOWNGRADE_RECOVERY_ESCROW_REQUIRED");
    expect(payload).toContain("NO_GO_CUSTOMER_NOTICE_REOPEN_REQUIRED");
    expect(payload).toContain("canRestoreFromDowngradeDirectly");
  });

  test("Shield and Real Markets expose downgrade recovery escrow selectors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
