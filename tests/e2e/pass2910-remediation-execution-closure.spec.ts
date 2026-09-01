import { expect, test } from "@playwright/test";

test.describe("PASS2910 Remediation Execution Closure", () => {
  test("API keeps closure NO_GO until remediation tickets and fresh retests exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/remediation-execution-closure");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.pass).toBe(2910);
    expect(body.gate).toBe("remediation-execution-closure");
    expect(body.productionDecision).toBe("NO_GO");
    expect(body.remediationExecutionStatus).toBe("NO_GO_REMEDIATION_EXECUTION_CLOSURE_REQUIRED");
    expect(body.verifiedClosureStatus).toBe("NO_GO_VERIFIED_RETEST_CLOSURE_REQUIRED");
    expect(body.canShowGreenProductionBadge).toBe(false);
    expect(body.canCloseCustomerCase).toBe(false);
    expect(body.canUseArbitrationTextAsFixProof).toBe(false);
    expect(body.canUseTicketStatusWithoutRuntimeReceipt).toBe(false);
  });

  test("Shield exposes PASS2910 remediation execution closure anchors", async ({ page }) => {
    await page.goto("/en/market-integrity");
    await expect(page.locator('[data-pass2910-remediation-execution-closure-shield-target]')).toBeVisible();
    await expect(page.locator('[data-pass2910-remediation-execution-closure-shield-desktop-chart]').first()).toBeVisible();
    await expect(page.locator('[data-pass2910-remediation-execution-closure-shield-mobile-chart]').first()).toBeVisible();
  });

  test("Real Markets exposes PASS2910 remediation execution closure anchors", async ({ page }) => {
    await page.goto("/en/real-markets");
    await expect(page.locator('[data-pass2910-remediation-execution-closure-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2910-remediation-execution-closure-realmarkets-chart]').first()).toBeVisible();
  });
});
