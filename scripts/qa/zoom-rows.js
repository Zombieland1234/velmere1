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
  // scroll down slightly
  await p.evaluate(() => window.scrollBy(0, 400));
  await p.waitForTimeout(500);
  await p.screenshot({
    path: 'artifacts/table_rows_scroll.png',
    clip: { x: 50, y: 300, width: 700, height: 750 }
  });
  console.log('Saved table_rows_scroll.png');
  await b.close();
})();
