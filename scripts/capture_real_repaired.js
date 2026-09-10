const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_real_markets_repaired_new.png' });
  console.log('Saved screen_real_markets_repaired_new.png');
  
  // Open Apple modal
  const row = page.locator('.realmarkets-pass578-grid, tr').first();
  await row.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_modal_apple_repaired.png' });
  console.log('Saved screen_modal_apple_repaired.png');

  await browser.close();
})();
