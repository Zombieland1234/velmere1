const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to http://localhost:3000/pl ...');
  const resp = await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  const hasErrorScreen = content.includes('Chwilowa przerwa') || content.includes('ui_');
  console.log('Response status:', resp.status());
  console.log('Has Error Screen:', hasErrorScreen);
  console.log('Errors logged:', errors);

  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_home_verified_live.png' });
  await browser.close();
})();
