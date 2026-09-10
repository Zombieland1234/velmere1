const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text = await page.innerText('body');
  console.log('PAGE BODY TEXT:', text);
  await browser.close();
})();
