const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. Login page at /pl/login
  console.log('Capturing /pl/login...');
  await page.goto('http://localhost:3000/pl/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '03_login_clean_no_scroll.png') });
  
  // 2. Header user menu dropdown
  console.log('Capturing header user dropdown...');
  await page.goto('http://localhost:3000/pl/browser', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const accountTrigger = page.locator('[data-testid="velmere-header-account-trigger"]');
  if (await accountTrigger.count() > 0) {
    await accountTrigger.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '04_header_user_menu.png') });
  }
  
  // 3. Risk drawer on /pl/market-integrity
  console.log('Capturing risk drawer...');
  await page.goto('http://localhost:3000/pl/market-integrity', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const riskButton = page.locator('button:has-text("/100")').first();
  if (await riskButton.count() > 0) {
    await riskButton.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '05_risk_engine_drawer.png') });
  
  await browser.close();
  console.log('Trio captured successfully!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
