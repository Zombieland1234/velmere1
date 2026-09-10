const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const testUrls = [
    'http://localhost:3000/pl',
    'http://localhost:3000/pl/browser',
    'http://localhost:3000/pl/real-markets',
    'http://localhost:3000/pl/shield',
    'http://localhost:3000/pl/shield-pro',
    'http://localhost:3000/pl/shield-map',
    'http://localhost:3000/pl/security/audits'
  ];

  for (const url of testUrls) {
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    const r = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const text = await page.content();
    const isError = text.includes('Chwilowa przerwa') || text.includes('ui_');
    console.log(`URL: ${url} | HTTP ${r.status()} | ErrorScreen: ${isError} | JSErrors: ${errs.length}`);
  }

  await browser.close();
})();
