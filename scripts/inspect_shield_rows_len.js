const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/pl/shield', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const rows = await page.locator('[role="row"]').count();
  console.log('Role row count in Shield:', rows);
  if (rows > 1) {
    const secondRow = page.locator('[role="row"]').nth(1);
    await secondRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_modal_opened.png' });
    console.log('Shield modal opened and screenshot saved!');
  }
  await browser.close();
})();
