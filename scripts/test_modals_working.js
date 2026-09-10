const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 1. Test Shield Pro
  console.log('Navigating to http://localhost:3000/pl/shield-pro...');
  await page.goto('http://localhost:3000/pl/shield-pro', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const spRow = page.locator('tbody tr').first();
  await spRow.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_pro_modal_working.png' });
  console.log('Shield Pro modal captured!');

  // 2. Test Shield
  console.log('Navigating to http://localhost:3000/pl/shield...');
  await page.goto('http://localhost:3000/pl/shield', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const sRow = page.locator('.realmarkets-pass578-grid, tr, [data-row]').first();
  await sRow.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_modal_working.png' });
  console.log('Shield modal captured!');

  await browser.close();
})();
