const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/en/real-markets', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const rows = await page.locator('[data-pass4577-shield-row], tr, [role="row"]').count();
  const allButtons = await page.locator('button').allInnerTexts();
  console.log('Row count:', rows, 'Buttons count:', allButtons.length);
  console.log('Sample buttons:', allButtons.slice(0, 15));
  const mainText = await page.locator('main').innerText().catch(() => 'no main');
  console.log('Main snippet:', mainText.slice(0, 400));
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/debug_real_markets.png' });
  await browser.close();
})();
