import { test, expect } from "@playwright/test";

test.describe("PASS2920 Recovery Restore Candidate Probation", () => {
  test("Shield and Real Markets expose restore probation evidence hooks", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2920-recovery-restore-probation-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2920-recovery-restore-probation-shield-desktop-chart]')).toBeVisible();
    await expect(page.locator('[data-pass2920-recovery-restore-probation-shield-mobile-chart]')).toBeVisible();
    await expect(page.locator('[data-pass2920-recovery-restore-probation-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2920-recovery-restore-probation-realmarkets-chart]')).toBeVisible();
  });

  test("API keeps recovery restore candidate probation fail-closed", async ({ request }) => {
    const response = await request.get("/api/market-integrity/recovery-restore-candidate-probation");
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.gate).toBe("recovery-restore-candidate-probation");
    expect(json.recoveryRestoreProbationStatus).toBe("NO_GO_RECOVERY_RESTORE_CANDIDATE_PROBATION_REQUIRED");
    expect(json.canRestoreImmediatelyAfterRecoveryDecision).toBe(false);
    expect(json.canShowGreenProductionBadge).toBe(false);
  });
});
