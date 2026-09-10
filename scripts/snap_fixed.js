const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_home_fixed_crest.png' });
  
  await page.evaluate(() => {
    window.scrollBy(0, 520);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_pipeline_fixed.png' });

  await page.goto('http://localhost:3000/pl/browser', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/marci/Desktop/Nowy folder/naprawa/screen_browser_fixed_crest.png' });

  await browser.close();
  console.log('Screenshots captured successfully!');
})();
