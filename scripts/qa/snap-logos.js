const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/real-markets');
  await p.waitForTimeout(2000);
  const logos = p.locator('span.velmere-asset-logo');
  const count = await logos.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    await logos.nth(i).screenshot({ path: `artifacts/logo_${i}.png` });
  }
  console.log('Saved individual logo screenshots!');
  await b.close();
})();
