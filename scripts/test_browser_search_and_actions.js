const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000/en/browser...');
  await page.goto('http://localhost:3000/en/browser', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('Current URL after redirect:', page.url());

  // 1. Search typing test
  console.log('Locating intelligence search input...');
  const searchInput = page.locator('input[role="combobox"], input[type="text"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill('ETH');
  await page.waitForTimeout(1500);

  // 2. Action card test: Explore Bitcoin Cash (BUG-001 regression check)
  console.log('Testing "Explore Bitcoin Cash" action card...');
  const bchCard = page.locator('text=/Bitcoin Cash|BCH/i').first();
  if (await bchCard.count() > 0) {
    await bchCard.click();
    await page.waitForTimeout(2000);
    console.log('Clicked BCH action card successfully.');
  }

  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_browser_verified_live.png' });
  console.log('Screenshot saved to screen_browser_verified_live.png');
  console.log('Total browser errors:', errors.length);

  await browser.close();
  if (errors.length > 0) {
    console.error('FAILED: Browser emitted unhandled errors!');
    process.exit(1);
  }
  console.log('SUCCESS: Browser search & action integration passed cleanly.');
})();
