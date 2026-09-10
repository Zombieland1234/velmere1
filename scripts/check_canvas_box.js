const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl/real-markets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const firstRow = page.locator('[data-testid="realmarkets-row"]').first();
  await firstRow.click();
  await page.waitForTimeout(1500);

  const box = await page.evaluate(() => {
    const canvas = document.querySelector('.vlm-asset-chart-canvas');
    if (!canvas) return 'NO CANVAS';
    const rect = canvas.getBoundingClientRect();
    const stage = document.querySelector('.vlm-asset-chart-stage');
    const stageRect = stage ? stage.getBoundingClientRect() : null;
    return {
      canvasRect: { width: rect.width, height: rect.height },
      canvasAttr: { width: canvas.width, height: canvas.height },
      stageRect: stageRect ? { width: stageRect.width, height: stageRect.height } : null,
      parentClasses: canvas.parentElement ? canvas.parentElement.className : null,
      grandParentClasses: canvas.parentElement?.parentElement ? canvas.parentElement.parentElement.className : null,
    };
  });
  console.log('Canvas box:', JSON.stringify(box, null, 2));
  await browser.close();
})();
