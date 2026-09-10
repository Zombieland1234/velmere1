import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("artifacts", { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/pl/shield-pro...");
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Dismiss cookie banner if present
  const cookieBtn = page.locator("button").filter({ hasText: /akceptuj|tylko niezbędne/i }).first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(400);
  }

  // 1. Capture Overview KPI grid (all 6 cards with real values)
  console.log("Capturing Status / KPI grid...");
  const statusGrid = page.locator(".shield-pro-v4608-status-grid");
  await statusGrid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await statusGrid.screenshot({ path: "artifacts/pass03_shield_pro_overview.png" });
  console.log("Captured artifacts/pass03_shield_pro_overview.png");

  // 2. Capture Table
  console.log("Capturing Table...");
  const tableCard = page.locator(".shield-pro-v4608-table-card");
  await tableCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/pass03_shield_pro_table.png" });
  console.log("Captured artifacts/pass03_shield_pro_table.png");

  // 3. Test Risk button click on first row
  console.log("Testing Risk button click on first row...");
  const riskTrigger = page.locator(".shield-pro-v4608-table-scroll table tbody tr:first-child [data-velmere-risk-history-trigger]").first();
  await riskTrigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await riskTrigger.click();
  await page.waitForTimeout(1000);

  const riskDialog = page.locator("[data-risk-history-dialog='expanded-customer-safe']");
  const isRiskDialogOpen = await riskDialog.isVisible();
  console.log("Risk dialog open (should be true):", isRiskDialogOpen);

  const assetModal = page.locator("[data-testid='vlm-asset-detail-modal']");
  const isAssetModalOpenPrematurely = await assetModal.isVisible();
  console.log("Asset modal open prematurely (should be false):", isAssetModalOpenPrematurely);

  await page.screenshot({ path: "artifacts/pass03_shield_pro_risk_modal.png" });
  console.log("Captured artifacts/pass03_shield_pro_risk_modal.png");

  // Close risk dialog by pressing Escape
  console.log("Closing risk dialog via Escape...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const isRiskDialogOpenAfter = await riskDialog.isVisible();
  console.log("Risk dialog open after Escape (should be false):", isRiskDialogOpenAfter);

  // 4. Click BTC row instrument cell to open AssetDetailModal
  console.log("Clicking BTC instrument cell to open AssetDetailModal...");
  const btcCell = page.locator(".shield-pro-v4608-table-scroll table tbody tr:first-child td:first-child").first();
  await btcCell.click();
  await page.waitForTimeout(2500);

  const isAssetModalOpen = await assetModal.isVisible();
  console.log("Asset modal open (should be true):", isAssetModalOpen);

  await page.screenshot({ path: "artifacts/pass03_shield_pro_modal.png" });
  console.log("Captured artifacts/pass03_shield_pro_modal.png");

  // 5. Test timeframe switch in modal
  console.log("Testing timeframe switch to 1H...");
  const tf1h = page.locator("button[data-pass4486-timeframe-key='1H']").first();
  if (await tf1h.isVisible()) {
    await tf1h.click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "artifacts/pass03_shield_pro_chart_1h.png" });
    console.log("Captured artifacts/pass03_shield_pro_chart_1h.png");
  }

  // Close modal
  const closeBtn = page.locator("button[aria-label='Close asset detail modal'], .vlm-asset-detail-modal header button").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log("PAS 03 Playwright verification finished successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
