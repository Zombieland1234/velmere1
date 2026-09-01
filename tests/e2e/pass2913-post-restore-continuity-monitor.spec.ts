import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2913-post-restore-continuity-monitor-shield-target]";
const realMarketsTarget = "[data-pass2913-post-restore-continuity-monitor-realmarkets-target]";

test.describe("PASS2913 Post-Restore Continuity Monitor", () => {
  test("public trust restore cannot be sustained without continuity receipts and drift sentinel", async ({ page }) => {
    await page.goto("/api/market-integrity/post-restore-continuity-monitor");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("post-restore-continuity-monitor");
    expect(payload).toContain("NO_GO_POST_RESTORE_CONTINUITY_MONITOR_REQUIRED");
    expect(payload).toContain("NO_GO_PUBLIC_TRUST_DRIFT_SENTINEL_REQUIRED");
    expect(payload).toContain("canSustainRestoredTrust");
  });

  test("Shield and Real Markets expose continuity monitor selectors for visual receipts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
