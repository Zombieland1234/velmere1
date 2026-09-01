import { expect, test } from "@playwright/test";

test.describe("PASS2912 Post-Remediation Trust Restore Handover", () => {
  test("API keeps trust restore NO_GO until final handover packet and signature exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/post-remediation-trust-restore-handover");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2912);
    expect(body.gate).toBe("post-remediation-trust-restore-handover");
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.trustRestoreHandoverStatus).toBe("NO_GO_TRUST_RESTORE_HANDOVER_REQUIRED");
    expect(body.publicRestoreCandidateStatus).toBe("NO_GO_PUBLIC_RESTORE_CANDIDATE_BLOCKED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canRestorePublicStatus).toBe(false);
    expect(body.canAutoRestoreAfterStabilityWatch).toBe(false);
    expect(body.canUseStabilityWatchAloneAsRestoreProof).toBe(false);
  });

  test("Shield exposes PASS2912 trust restore handover anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2912-post-remediation-trust-restore-handover-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2912-post-remediation-trust-restore-handover-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2912-post-remediation-trust-restore-handover-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2912 trust restore handover anchors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2912-post-remediation-trust-restore-handover-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2912-post-remediation-trust-restore-handover-realmarkets-chart]').first()).toBeVisible();
  });
});
