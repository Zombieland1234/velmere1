const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click first row (Apple)
  const firstRow = page.locator('.realmarkets-pass578-grid, [data-symbol="AAPL"], tr').first();
  await firstRow.click();
  await page.waitForTimeout(1500);
  
  // Click 4H timeframe button
  const btn4H = page.locator('button:has-text("4H"), button:has-text("4h")').first();
  console.log('Clicking 4H button...');
  await btn4H.click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_modal_4h_clicked.png' });
  console.log('Saved screenshot 4H clicked!');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_modal_4h_loaded.png' });
  console.log('Saved screenshot 4H loaded!');
  
  await browser.close();
})();
