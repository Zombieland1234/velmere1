const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to http://localhost:3000/pl/shield-pro...');
  await page.goto('http://localhost:3000/pl/shield-pro', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Clicking first table row...');
  const firstRow = page.locator('tbody tr').first();
  await firstRow.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_pro_modal_clicked.png' });
  console.log('Screenshot saved to screen_shield_pro_modal_clicked.png');

  await browser.close();
})();
