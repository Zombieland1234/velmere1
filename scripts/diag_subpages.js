const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  const subpages = [
    '/pl/search',
    '/pl/intelligence',
    '/pl/atelier',
    '/pl/market-integrity',
    '/pl/cart',
    '/pl/vlm-token',
    '/pl/research-lab',
    '/pl/security',
    '/pl/square',
    '/pl/lookbook',
    '/pl/community',
    '/pl/faq',
    '/pl/impressum',
    '/pl/privacy',
    '/pl/returns'
  ];

  for (const path of subpages) {
    const url = 'http://localhost:3000' + path;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(`[PAGE_ERR] ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`[CONSOLE_ERR] ${msg.text()}`);
    });

    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      const status = resp ? resp.status() : 'NO_RESP';
      const bodyLen = (await page.content()).length;
      console.log(`Path: ${path.padEnd(24)} | Status: ${status} | BodyLen: ${bodyLen} | Errors: ${errors.length}`);
      if (errors.length > 0 || status >= 400) {
        errors.slice(0, 3).forEach(e => console.log('   -> ' + e.slice(0, 150)));
      }
    } catch (e) {
      console.log(`Path: ${path.padEnd(24)} | FAILED: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
