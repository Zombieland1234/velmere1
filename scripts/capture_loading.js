const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Slow down network slightly to easily capture loading state
  await page.route('**/api/market-integrity/**', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });

  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  const cookieBtn = page.locator('button:has-text("AKCEPTUJ"), button:has-text("TYLKO NIEZBĘDNE")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  // Click row to open modal
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();

  // Immediately capture loading state
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart_loading.png') });
  console.log('Saved pass01_real_markets_chart_loading.png');

  await browser.close();
})();
