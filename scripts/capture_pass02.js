const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Shield (/pl/shield)...');
  await page.goto('http://localhost:3000/pl/shield', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Dismiss cookie banner
  const cookieBtn = page.locator('button:has-text("AKCEPTUJ"), button:has-text("TYLKO NIEZBĘDNE")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  // 1. Table screenshot
  await page.screenshot({ path: path.join(__dirname, '../artifacts/pass02_shield_table.png') });
  console.log('Saved pass02_shield_table.png');

  // 2. Overview tiles screenshot
  const overview = page.locator('.shield-kpi-grid-pass2382, .shield-overview-grid, [data-shield-overview]').first();
  if (await overview.count() > 0) {
    await overview.screenshot({ path: path.join(__dirname, '../artifacts/pass02_shield_overview.png') });
    console.log('Saved pass02_shield_overview.png');
  }

  await browser.close();
})();
