const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/pl', { waitUntil: 'load' });
  const title = await page.title();
  const bodyText = await page.innerText('body');
  console.log('Title:', title);
  console.log('Body start:', bodyText.slice(0, 300));
  await browser.close();
})();
