import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("artifacts", { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/pl/shield...");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Dismiss cookie banner if present
  const cookieBtn = page.locator("button").filter({ hasText: /akceptuj|tylko niezbędne/i }).first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(400);
  }

  // 1. Capture Overview KPI grid
  console.log("Capturing Overview KPI grid...");
  const overviewGrid = page.locator(".shield-kpi-grid-pass2382");
  await overviewGrid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await overviewGrid.screenshot({ path: "artifacts/pass02_shield_overview.png" });
  console.log("Captured artifacts/pass02_shield_overview.png");

  // 2. Capture Table
  console.log("Capturing Table...");
  const table = page.locator(".shield-table-shell-pass2382");
  await table.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/pass02_shield_table.png" });
  console.log("Captured artifacts/pass02_shield_table.png");

  // 3. Test Risk Modal trigger and click propagation
  console.log("Testing Risk button click on first row...");
  const riskTrigger = page.locator("[data-velmere-risk-history-trigger]").first();
  await riskTrigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await riskTrigger.click();
  await page.waitForTimeout(1000);

  // Verify Risk dialog is open
  const riskDialog = page.locator("[data-risk-history-dialog='expanded-customer-safe']");
  const isRiskDialogOpen = await riskDialog.isVisible();
  console.log("Risk dialog open:", isRiskDialogOpen);

  // Verify AssetDetailModal is NOT open
  const assetModal = page.locator("[data-testid='vlm-asset-detail-modal'], .vlm-asset-detail-backdrop");
  const isAssetModalOpen = await assetModal.isVisible();
  console.log("Asset detail modal open (should be false):", isAssetModalOpen);

  // Verify body overflow is locked
  const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
  console.log("Body overflow (should be 'hidden'):", bodyOverflow);

  // Capture Risk Modal screenshot
  await page.screenshot({ path: "artifacts/pass02_shield_risk_modal.png" });
  console.log("Captured artifacts/pass02_shield_risk_modal.png");

  // Close risk dialog by clicking close button
  const closeBtn = page.locator("button[aria-label='Zamknij']").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    // Click backdrop
    await page.mouse.click(10, 10);
  }
  await page.waitForTimeout(500);

  // Verify body overflow restored
  const bodyOverflowRestored = await page.evaluate(() => document.body.style.overflow);
  console.log("Body overflow restored:", bodyOverflowRestored);

  // 4. Click BTC row instrument cell to open AssetDetailModal
  console.log("Clicking BTC instrument cell to open AssetDetailModal...");
  const btcRow = page.locator(".shield-desktop-grid-row-pass4577").first();
  const btcCell = btcRow.locator(".shield-grid-instrument-pass4577");
  await btcCell.click();
  await page.waitForTimeout(2500);

  // Capture AssetDetailModal
  await page.screenshot({ path: "artifacts/pass02_shield_chart.png" });
  console.log("Captured artifacts/pass02_shield_chart.png");

  // 5. Test loading state on timeframe switch
  console.log("Testing chart loading state on timeframe switch...");
  const tf1h = page.locator("button[data-pass4486-timeframe-key='1H']").first();
  if (await tf1h.isVisible()) {
    await tf1h.click({ force: true });
    await page.waitForTimeout(80);
    await page.screenshot({ path: "artifacts/pass02_shield_chart_loading.png" });
    console.log("Captured artifacts/pass02_shield_chart_loading.png");
  }

  await browser.close();
  console.log("PAS 02 Playwright verification finished!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
