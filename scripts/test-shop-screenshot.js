const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl/shop', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '07_shop_coming_soon.png') });
  const card = page.locator('h1').filter({ hasText: 'COMING SOON' });
  console.log('Card bounding box:', await card.boundingBox());
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
