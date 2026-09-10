const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/pl/shield', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const text = await page.innerText('body');
  console.log('Shield page preview:', text.slice(0, 400));
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_actual.png' });
  await browser.close();
})();
