const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto('http://localhost:3000/pl', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Dismiss cookies
  try {
    const btn = await page.getByRole('button', { name: /akceptuj/i }).first();
    if (await btn.isVisible()) await btn.click();
  } catch (e) {}
  await page.waitForTimeout(400);

  // 1. Clean hero before mouse movement (no grid, pure clean luxury)
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'naprawa/screen_clean_no_hover.png' });
  console.log('Saved screen_clean_no_hover.png');

  // 2. Mouse moves across hero (e.g. x: 500, y: 340) - cyber grid spotlight reveals under cursor!
  await page.mouse.move(520, 320);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'naprawa/screen_interactive_grid_hero.png' });
  console.log('Saved screen_interactive_grid_hero.png');

  // 3. Specialized Surfaces - Clean Cards & Hover state
  await page.evaluate(() => window.scrollTo({ top: 1550, behavior: 'instant' }));
  await page.waitForTimeout(400);
  // Hover over the first specialized surface card (Velmere Shield)
  await page.mouse.move(350, 400);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'naprawa/screen_clean_surfaces_hover.png' });
  console.log('Saved screen_clean_surfaces_hover.png');

  // 4. Workflow Methodology Cards (Clean 01-04)
  await page.evaluate(() => window.scrollTo({ top: 2200, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.mouse.move(400, 500);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'naprawa/screen_clean_workflow.png' });
  console.log('Saved screen_clean_workflow.png');

  await browser.close();
})();
