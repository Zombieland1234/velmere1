const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // 1. Check Homepage Shield
  const page1 = await context.newPage();
  try {
    await page1.goto('http://localhost:3000/pl', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page1.waitForTimeout(2000);
    await page1.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_home_shield_repaired.png' });
    console.log('Homepage screenshot captured!');
  } catch (err) {
    console.error('Home error:', err.message);
  }

  // 2. Check Browser Shield
  const page2 = await context.newPage();
  try {
    await page2.goto('http://localhost:3000/pl/browser', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page2.waitForTimeout(2000);
    await page2.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_browser_shield_repaired.png' });
    console.log('Browser screenshot captured!');
  } catch (err) {
    console.error('Browser error:', err.message);
  }

  // 3. Check Shield Map Globe
  const page3 = await context.newPage();
  try {
    await page3.goto('http://localhost:3000/pl/shield-map', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page3.waitForTimeout(2000);
    await page3.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_shield_map_globe_repaired.png' });
    console.log('Shield map screenshot captured!');
  } catch (err) {
    console.error('Shield Map error:', err.message);
  }

  await browser.close();
})();
