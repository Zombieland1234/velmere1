const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. Login page
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/pl/account/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '03_login_clean_no_scroll.png') });
  
  // 2. Header user menu
  console.log('Testing header user menu...');
  await page.goto('http://localhost:3000/pl/browser', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  // find user profile button in header (aria-label or button with user icon)
  const userButton = page.locator('header button[aria-label*="konto" i], header button[aria-label*="profil" i], header a[href*="/account"]');
  if (await userButton.count() > 0) {
    await userButton.first().click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '04_header_user_menu.png') });
  
  // 3. Market integrity risk engine
  console.log('Testing market integrity...');
  await page.goto('http://localhost:3000/pl/market-integrity', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '05_risk_engine_drawer.png') });
  
  // 4. Intelligence liquidity lab
  console.log('Testing liquidity lab...');
  await page.goto('http://localhost:3000/pl/intelligence#liquidity-lab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const liquidity = page.locator('#liquidity-lab');
  if (await liquidity.count() > 0) {
    await liquidity.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '11_intelligence_liquidity_section.png') });
  
  await browser.close();
  console.log('All remaining screenshots captured successfully!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
