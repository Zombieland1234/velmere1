import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("PASS2893 Release Evidence Bundle", () => {
  test("Shield evidence target is screenshot-ready and keeps live claim boundary explicit", async ({ page }) => {
    await page.goto(`${baseURL}/en/shield`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-pass2893-release-evidence-shield-target]")).toBeVisible();
    await expect(page.locator("[data-pass2893-release-evidence-shield-desktop-chart]").first()).toBeVisible();
    const rowCount = await page.locator("tbody tr").count();
    expect(rowCount).toBeGreaterThan(10);
    const forcedFirstRow = await page.locator("tbody tr").first().getAttribute("data-forced-highlight");
    expect(forcedFirstRow).not.toBe("true");
    await page.screenshot({ path: "test-results/pass2893-release-evidence-bundle/shield-rows-chart-receipt.png", fullPage: true });
  });

  test("Real Markets evidence target is screenshot-ready without legacy grey underlay", async ({ page }) => {
    await page.goto(`${baseURL}/en/real-markets`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-pass2893-release-evidence-realmarkets-target]")).toBeVisible();
    await expect(page.locator("[data-pass2893-release-evidence-realmarkets-chart]").first()).toBeVisible();
    await expect(page.locator("[data-pass2888-realmarkets-no-grey-underlay]").first()).toBeVisible();
    await page.screenshot({ path: "test-results/pass2893-release-evidence-bundle/realmarkets-icons-chart-receipt.png", fullPage: true });
  });

  test("release evidence bundle route blocks clean-live claim until receipts exist", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/market-integrity/release-evidence-bundle`);
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.pass).toBe(2893);
    expect(json.canClaimCleanTypecheck).toBe(false);
    expect(json.canClaimCleanBuild).toBe(false);
    expect(json.canClaimWorldClassLive).toBe(false);
    expect(json.requiredReceiptFiles.length).toBeGreaterThan(5);
  });
});
