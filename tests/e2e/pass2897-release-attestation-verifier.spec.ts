import { expect, test } from "@playwright/test";

test.describe("PASS2897 Release Attestation Verifier", () => {
  test("operator release attestation route remains NO_GO until digest-bound receipts exist", async ({ request }) => {
    const response = await request.get("/api/market-integrity/release-attestation-verifier");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.gate).toBe("release-attestation-verifier");
    expect(payload.pass).toBe(2897);
    expect(payload.defaultProductionDecision).toBe("NO_GO");
    expect(payload.canClaimCleanBuild).toBe(false);
    expect(payload.canClaimWorldClassLive).toBe(false);
    expect(payload.canOperatorApproveProduction).toBe(false);
    expect(Array.isArray(payload.requiredAttestations)).toBeTruthy();
    expect(payload.requiredAttestations.length).toBeGreaterThanOrEqual(12);
  });

  test("Shield release attestation selectors are present for desktop and mobile chart receipts", async ({ page }) => {
    await page.goto("/en/market-integrity", { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-pass2897-release-attestation-shield-target]');
    await expect(target.first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-pass2897-release-attestation-shield-desktop-chart]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-pass2897-release-attestation-shield-mobile-chart]').first()).toBeAttached({ timeout: 15000 });
  });

  test("Real Markets release attestation selectors are present for icon/chart/no-underlay receipts", async ({ page }) => {
    await page.goto("/en/real-markets", { waitUntil: "domcontentloaded" });
    const target = page.locator('[data-pass2897-release-attestation-realmarkets-target]');
    await expect(target.first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-pass2897-release-attestation-realmarkets-chart]').first()).toBeVisible({ timeout: 15000 });
  });
});
