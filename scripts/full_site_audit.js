const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const pagesToTest = [
    { url: 'http://localhost:3000/pl', name: '01_home_repaired.png' },
    { url: 'http://localhost:3000/pl/browser', name: '02_browser_repaired.png' },
    { url: 'http://localhost:3000/pl/real-markets', name: '03_real_markets_repaired.png' },
    { url: 'http://localhost:3000/pl/shield', name: '04_shield_repaired.png' },
    { url: 'http://localhost:3000/pl/shield-pro', name: '05_shield_pro_repaired.png' },
    { url: 'http://localhost:3000/pl/shield-map', name: '06_shield_map_globe_repaired.png' },
    { url: 'http://localhost:3000/pl/security/audits', name: '07_security_audits_clean.png' },
    { url: 'http://localhost:3000/pl/shipping', name: '08_shipping_page.png' },
    { url: 'http://localhost:3000/pl/terms', name: '09_terms_page.png' },
    { url: 'http://localhost:3000/pl/shop', name: '10_shop_coming_soon.png' },
  ];

  for (const item of pagesToTest) {
    const page = await context.newPage();
    console.log(`Navigating to ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(2000);
      const outPath = `C:/Users/marci/Desktop/Nowy folder/naprawa/${item.name}`;
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved screenshot: ${item.name}`);
    } catch (e) {
      console.error(`Error loading ${item.url}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
