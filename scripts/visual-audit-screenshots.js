const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT_DIR = path.join(__dirname, '..', 'preview_screenshots', 'dual_pass_audit');

async function run() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('1. Auditing /pl/browser...');
  await page.goto('http://localhost:3000/pl/browser', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '01_browser_shield_background.png'), fullPage: false });
  console.log('Saved 01_browser_shield_background.png');

  console.log('2. Auditing /pl/shield...');
  await page.goto('http://localhost:3000/pl/shield', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '02_shield_pro_monochrome.png'), fullPage: false });
  console.log('Saved 02_shield_pro_monochrome.png');

  console.log('3. Auditing Risk Button Hover and Modal...');
  try {
    const riskBtn = page.locator('button[data-risk-history-control-role="trigger"]').first();
    if (await riskBtn.count() > 0) {
      await riskBtn.hover();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '03_risk_control_hover.png'), fullPage: false });
      console.log('Saved 03_risk_control_hover.png');
      await riskBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '04_risk_control_modal.png'), fullPage: false });
      console.log('Saved 04_risk_control_modal.png');
      const closeBtn = page.locator('button[aria-label="Zamknij historię ryzyka"], button[aria-label="Close"]').first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    }
  } catch (err) {
    console.warn('Risk button interaction note:', err.message);
  }

  console.log('4. Auditing Asset Detail Modal Candlesticks...');
  try {
    const assetRow = page.locator('button[data-vlm-asset-symbol], tr[data-asset-symbol]').first();
    if (await assetRow.count() > 0) {
      await assetRow.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, '05_asset_detail_candlesticks.png'), fullPage: false });
      console.log('Saved 05_asset_detail_candlesticks.png');
    }
  } catch (err) {
    console.warn('Asset modal note:', err.message);
  }

  console.log('5. Auditing /pl/intelligence...');
  await page.goto('http://localhost:3000/pl/intelligence', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '06_intelligence_animations.png'), fullPage: false });
  console.log('Saved 06_intelligence_animations.png');

  console.log('6. Auditing /pl/shop (Coming Soon blur card)...');
  await page.goto('http://localhost:3000/pl/shop', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '07_shop_coming_soon.png'), fullPage: false });
  console.log('Saved 07_shop_coming_soon.png');

  console.log('7. Auditing /pl/angel (Disclaimer & Flip)...');
  await page.goto('http://localhost:3000/pl/angel', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '08_angel_initial_disclaimer.png'), fullPage: false });
  console.log('Saved 08_angel_initial_disclaimer.png');

  await browser.close();
  console.log('All visual audit screenshots completed successfully!');
}

run().catch((err) => {
  console.error('Visual audit failed:', err);
  process.exit(1);
});
