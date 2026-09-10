const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log('[BROWSER UNCAUGHT]:', err.message, err.stack);
  });

  console.log('Navigating to http://localhost:3000/pl ...');
  await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  console.log('Contains "Chwilowa przerwa":', content.includes('Chwilowa przerwa'));

  await browser.close();
})();
