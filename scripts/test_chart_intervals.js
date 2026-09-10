const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Real Markets...');
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner
  const cookieBtn = page.locator('button:has-text("AKCEPTUJ"), button:has-text("TYLKO NIEZBĘDNE")').first();
  if (await cookieBtn.isVisible()) {
    console.log('Dismissing cookie banner...');
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  // Open Apple modal
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  console.log('Clicked first row. Waiting for chart to load...');

  // Wait for canvas or loading to finish
  await page.waitForTimeout(2000);

  // Check if chart loading is still present
  const loadingShimmer = page.locator('.vlm-chart-loading-shimmer, .vlm-chart-loading-surface');
  console.log('Loading element count:', await loadingShimmer.count());
  if (await loadingShimmer.count() > 0 && await loadingShimmer.first().isVisible()) {
    console.log('Chart is still loading...');
    // Take loading screenshot
    await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart_loading.png') });
    console.log('Saved pass01_real_markets_chart_loading.png');
  }

  // Wait until canvas has drawn or loading is gone
  for (let i = 0; i < 20; i++) {
    const isVisible = await loadingShimmer.first().isVisible().catch(() => false);
    if (!isVisible) {
      console.log(`Loading finished after ${i * 500}ms!`);
      break;
    }
    await page.waitForTimeout(500);
  }

  // Check canvas
  const canvas = page.locator('.vlm-asset-chart-canvas');
  console.log('Canvas count:', await canvas.count(), 'visible:', await canvas.first().isVisible().catch(() => false));

  // Take chart screenshot
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart.png') });
  console.log('Saved pass01_real_markets_chart.png');

  // Click 1h
  const btn1h = page.locator('button:has-text("1h")').first();
  if (await btn1h.isVisible()) {
    console.log('Clicking 1h interval...');
    await btn1h.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart_1h.png') });
    console.log('Saved pass01_real_markets_chart_1h.png');
  }

  await browser.close();
})();
