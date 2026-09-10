const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3000/en/real-markets');
  await p.waitForTimeout(1000);
  const btn = p.locator('button', { hasText: 'ALLOW ALL' });
  if (await btn.isVisible()) {
    await btn.click();
    await p.waitForTimeout(500);
  }
  await p.screenshot({ path: 'artifacts/pass09_real_markets_colored_logos_full.png' });
  console.log('Full screenshot saved successfully!');
  await b.close();
})();
