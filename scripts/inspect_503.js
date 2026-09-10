const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('FAILED URL:', res.url(), 'STATUS:', res.status());
    }
  });

  await page.goto('http://localhost:3000/pl/shield-pro', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const firstRow = page.locator('tbody tr').first();
  await firstRow.click();
  await page.waitForTimeout(2000);

  await browser.close();
})();
