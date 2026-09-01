import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("PASS2892 Shield / Real Markets / PDF receipt smoke", () => {
  test("Shield renders more than ten rows with neutral selection and chart receipt lanes", async ({ page }) => {
    await page.goto(`${baseURL}/en/shield`, { waitUntil: "networkidle" });
    const shell = page.locator('[data-pass2892-playwright-shield-target]');
    await expect(shell).toBeVisible();
    await expect(page.locator('[data-pass2892-playwright-shield-desktop-chart-receipt]').first()).toBeVisible();
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(10);
    const forcedFirstRow = await page.locator('tbody tr').first().getAttribute('data-forced-highlight');
    expect(forcedFirstRow).not.toBe('true');
    await page.screenshot({ path: 'test-results/pass2892-shield-realmarkets-pdf-smoke/shield-rows-chart-receipt.png', fullPage: true });
  });

  test("Real Markets renders icon/chart receipt lanes without legacy grey chart underlay", async ({ page }) => {
    await page.goto(`${baseURL}/en/real-markets`, { waitUntil: "networkidle" });
    await expect(page.locator('[data-pass2892-playwright-realmarkets-target]')).toBeVisible();
    await expect(page.locator('[data-pass2892-playwright-realmarkets-chart-receipt]').first()).toBeVisible();
    await expect(page.locator('[data-pass2888-realmarkets-no-grey-underlay]').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/pass2892-shield-realmarkets-pdf-smoke/realmarkets-icons-chart-receipt.png', fullPage: true });
  });

  test("PASS2892 receipt pack route keeps clean-live claim blocked until receipts exist", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/market-integrity/playwright-receipt-pack`);
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.pass).toBe(2892);
    expect(json.canClaimCleanBuild).toBe(false);
    expect(json.canClaimWorldClassLive).toBe(false);
  });
});
