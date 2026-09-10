const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  const urls = [
    'http://localhost:3000/',
    'http://localhost:3000/pl',
    'http://localhost:3000/en',
    'http://localhost:3000/de',
    'http://localhost:3000/pl/browser',
    'http://localhost:3000/pl/real-markets',
    'http://localhost:3000/pl/shield',
    'http://localhost:3000/pl/shield-pro',
    'http://localhost:3000/pl/shield-map',
    'http://localhost:3000/pl/security/audits',
    'http://localhost:3000/pl/contact',
    'http://localhost:3000/pl/terms',
    'http://localhost:3000/pl/shipping',
    'http://localhost:3000/pl/shop'
  ];

  for (const url of urls) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(`[PAGE_ERR] ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`[CONSOLE_ERR] ${msg.text()}`);
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      const status = resp ? resp.status() : 'NO_RESP';
      const title = await page.title();
      const bodyLen = (await page.content()).length;
      console.log(`URL: ${url} | Status: ${status} | BodyLen: ${bodyLen} | Title: "${title}" | Errors: ${errors.length}`);
      if (errors.length > 0) {
        errors.slice(0, 3).forEach(e => console.log('   -> ' + e.slice(0, 150)));
      }
    } catch (e) {
      console.log(`URL: ${url} | FAILED TO LOAD: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
