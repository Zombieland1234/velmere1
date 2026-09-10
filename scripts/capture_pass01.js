const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Real Markets...');
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Table screenshot
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_main.png') });
  console.log('1. pass01_real_markets_main.png saved');

  // 2. Open modal by clicking the first asset row
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  await page.waitForTimeout(2000);

  // Check chart intervals: click 15m or 1h
  const interval15m = page.locator('button:has-text("15m")').first();
  if (await interval15m.isVisible()) {
    console.log('Clicking 15m interval...');
    await interval15m.click();
    await page.waitForTimeout(1500);
  }

  // 3. Modal chart screenshot
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_chart.png') });
  console.log('2. pass01_real_markets_chart.png saved');

  // 4. Switch to Analysis tab
  const analysisTab = page.locator('button:has-text("Analiza")').first();
  if (await analysisTab.isVisible()) {
    console.log('Clicking Analiza tab...');
    await analysisTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, '../artifacts/pass01_real_markets_analysis.png') });
    console.log('3. pass01_real_markets_analysis.png saved');
  }

  await browser.close();
  console.log('Done capturing pass01 baseline.');
})();
