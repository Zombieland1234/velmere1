const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to http://localhost:3000/en/real-markets...');
  await page.goto('http://localhost:3000/en/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Locating first asset row in Real Markets table...');
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  await page.waitForTimeout(2000);

  console.log('Verifying chart modal opened...');
  const modal = page.locator('[role="dialog"], [data-pass4587-modal], .realmarkets-modal, [data-vlm-asset-appearance]').last();
  await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
  console.log('Modal visible:', await modal.isVisible());

  // Click 4h interval inside modal
  const btn4h = modal.locator('button').filter({ hasText: /^4[hH]$/ }).first();
  if (await btn4h.count() > 0) {
    console.log('Clicking 4h interval...');
    await btn4h.click({ force: true });
    await page.waitForTimeout(1500);
  }

  // Click 1D interval inside modal
  const btn1d = modal.locator('button').filter({ hasText: /^1[dD]$/ }).first();
  if (await btn1d.count() > 0) {
    console.log('Clicking 1D interval...');
    await btn1d.click({ force: true });
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_real_markets_chart_intervals_verified.png' });
  console.log('Screenshot saved to screen_real_markets_chart_intervals_verified.png');
  console.log('Browser errors:', errors.length);

  await browser.close();
  if (errors.length > 0) process.exit(1);
})();
