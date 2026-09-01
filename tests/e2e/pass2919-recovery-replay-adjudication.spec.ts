import { expect, test } from "@playwright/test";

const shieldTarget = "[data-pass2919-recovery-replay-adjudication-shield-target]";
const realMarketsTarget = "[data-pass2919-recovery-replay-adjudication-realmarkets-target]";

test.describe("PASS2919 Recovery Replay Adjudication", () => {
  test("recovery replay adjudication requires independent replay and customer acknowledgement", async ({ page }) => {
    await page.goto("/api/market-integrity/recovery-replay-adjudication");
    const payload = await page.locator("body").innerText();
    expect(payload).toContain("recovery-replay-adjudication");
    expect(payload).toContain("NO_GO_RECOVERY_REPLAY_ADJUDICATION_REQUIRED");
    expect(payload).toContain("NO_GO_CUSTOMER_ACKNOWLEDGEMENT_REQUIRED");
    expect(payload).toContain("canPromoteRecoveryEscrowDirectly");
  });

  test("Shield and Real Markets expose recovery replay adjudication selectors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(shieldTarget).first()).toBeAttached();
    await expect(page.locator(realMarketsTarget).first()).toBeAttached();
  });
});
