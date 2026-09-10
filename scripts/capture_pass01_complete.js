const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to Real Markets...');
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner
  const cookieBtn = page.locator('button:has-text("AKCEPTUJ"), button:has-text("TYLKO NIEZBĘDNE")').first();
  if (await cookieBtn.isVisible()) {
    console.log('Dismissing cookie banner...');
    await cookieBtn.click();
    await page.waitForTimeout(600);
  }

  // 1. Table screenshot
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_main.png') });
  console.log('Saved pass01_real_markets_main.png');

  // 2. Open modal by clicking first row
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  console.log('Clicked first row, waiting for modal...');
  await page.waitForTimeout(1000);

  // Take screenshot of chart on 15m
  // Ensure chart is fully rendered
  const canvas = page.locator('.vlm-asset-chart-canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart.png') });
  console.log('Saved pass01_real_markets_chart.png (15m candles)');

  // 3. Click 1h timeframe
  const btn1h = page.locator('.vlm-asset-timeframes [data-pass4486-timeframe-key="1H"]').first();
  if (await btn1h.isVisible()) {
    console.log('Clicking 1h timeframe...');
    await btn1h.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart_1h.png') });
    console.log('Saved pass01_real_markets_chart_1h.png');
  }

  // 4. Switch to Analiza tab
  const analysisTabBtn = page.locator('button:has-text("ANALIZA"), button:has-text("Analiza")').first();
  if (await analysisTabBtn.isVisible()) {
    console.log('Clicking Analiza tab...');
    await analysisTabBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_analysis.png') });
    console.log('Saved pass01_real_markets_analysis.png');
  }

  // 5. Test loading view
  // Open modal on another asset to capture initial loading or test loading surface
  console.log('Testing clean loading surface...');
  const closeBtn = page.locator('.vlm-asset-detail-close, button[aria-label*="Zamknij"], button[aria-label*="close"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(600);
  }

  await browser.close();
  console.log('Pass 01 complete verification script finished successfully.');
})();
