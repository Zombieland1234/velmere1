const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl/browser', { waitUntil: 'networkidle' });
  
  // Find Angel trigger button
  const angelBtn = page.locator('button').filter({ hasText: 'ANGEL' }).first();
  console.log('Angel button found:', await angelBtn.count());
  await angelBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '08_angel_open_drawer.png') });
  console.log('Saved 08_angel_open_drawer.png');

  // Type a question
  const input = page.locator('input.angel-input');
  if (await input.count() > 0) {
    await input.fill('Jaki jest status Bitcoina?');
    await page.keyboard.press('Enter');
    console.log('Sent question to Angel...');
    // Wait for response or thinking state
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '09_angel_chat_flip.png') });
    console.log('Saved 09_angel_chat_flip.png');
  }

  await browser.close();
  console.log('Angel test done!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
