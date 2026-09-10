const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const pages = [
    'http://localhost:3000/pl',
    'http://localhost:3000/pl/browser',
    'http://localhost:3000/pl/real-markets',
    'http://localhost:3000/pl/shield',
    'http://localhost:3000/pl/shield-pro',
    'http://localhost:3000/pl/shield-map',
    'http://localhost:3000/pl/security/audits'
  ];

  for (const url of pages) {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    console.log(`URL: ${url} | Status: ${resp.status()} | PageErrors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
  }

  await browser.close();
})();
