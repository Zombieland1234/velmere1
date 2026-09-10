const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const headerGrid = page.locator('.realmarkets-pass578-grid').first();
  const headerChildren = await headerGrid.locator('> *').all();
  console.log('Header children count:', headerChildren.length);
  for (let i = 0; i < headerChildren.length; i++) {
    const box = await headerChildren[i].boundingBox();
    const text = (await headerChildren[i].innerText()).replace(/\n/g, ' ');
    console.log(`Header col ${i+1} [${text}]: x=${Math.round(box.x)} w=${Math.round(box.width)} center=${Math.round(box.x + box.width/2)}`);
  }

  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  const rowChildren = await firstRow.locator('> *').all();
  console.log('\nRow children count:', rowChildren.length);
  for (let i = 0; i < rowChildren.length; i++) {
    const box = await rowChildren[i].boundingBox();
    console.log(`Row col ${i+1}: x=${Math.round(box.x)} w=${Math.round(box.width)} center=${Math.round(box.x + box.width/2)}`);
  }

  const riskBadge = rowChildren[7].locator('button, [role="button"]').first();
  if (await riskBadge.count() > 0) {
    const badgeBox = await riskBadge.boundingBox();
    console.log(`Risk badge inside row col 8: x=${Math.round(badgeBox.x)} w=${Math.round(badgeBox.width)} center=${Math.round(badgeBox.x + badgeBox.width/2)}`);
  }
  const sparkline = rowChildren[8].locator('svg').first();
  if (await sparkline.count() > 0) {
    const sparkBox = await sparkline.boundingBox();
    console.log(`Sparkline svg inside row col 9: x=${Math.round(sparkBox.x)} w=${Math.round(sparkBox.width)} center=${Math.round(sparkBox.x + sparkBox.width/2)}`);
  }

  await browser.close();
})();
