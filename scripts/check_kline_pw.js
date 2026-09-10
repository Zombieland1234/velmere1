const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));
  const res = await page.goto('http://localhost:3000/api/market-integrity/klines?assetClass=crypto&marketId=zcash&symbol=ZEC&quote=USD&range=15m');
  console.log('HTTP status:', res.status());
  const body = await res.text();
  console.log('Body:', body);
  await browser.close();
})();
