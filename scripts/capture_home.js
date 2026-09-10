const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  console.log('Navigating to homepage...');
  await page.goto('http://localhost:3000/pl', { waitUntil: 'load', timeout: 35000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_home_shield_repaired.png' });
  console.log('Homepage screenshot OK!');
  await browser.close();
})();
