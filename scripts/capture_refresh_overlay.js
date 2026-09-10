const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Delay API responses so we can capture the overlay clearly
  await page.route('**/api/market-integrity/**', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });

  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  const cookieBtn = page.locator('button:has-text("AKCEPTUJ"), button:has-text("TYLKO NIEZBĘDNE")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  await page.waitForTimeout(2000); // let initial load finish

  // Click 1H timeframe
  const btn1h = page.locator('.vlm-asset-timeframes [data-pass4486-timeframe-key="1H"]').first();
  await btn1h.click();

  // Capture while refreshing
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart_loading.png') });
  console.log('Saved pass01_real_markets_chart_loading.png (refreshing overlay)');

  await browser.close();
})();
