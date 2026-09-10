const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navigating to http://localhost:3000/en/shield...');
  await page.goto('http://localhost:3000/en/shield', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('Locating grid row...');
  const row = page.locator('[data-pass4577-shield-row]').first();
  await row.click();
  await page.waitForTimeout(2000);

  const modal = page.locator('[role="dialog"], [data-pass4587-modal], .shield-modal, .vlm-modal');
  const modalCount = await modal.count();
  console.log('Modal elements found:', modalCount);

  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_modal_opened.png' });
  console.log('Screenshot saved to screen_shield_modal_opened.png');
  console.log('Browser errors:', errors.length);

  await browser.close();
  if (errors.length > 0) process.exit(1);
})();
