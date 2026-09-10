const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/pl/intelligence', { waitUntil: 'networkidle' });
  
  const squeeze = page.locator('div[class*="squeezeExperience"]');
  const count = await squeeze.count();
  console.log('squeezeExperience count:', count);
  
  if (count > 0) {
    const isVis = await squeeze.isVisible();
    const box = await squeeze.boundingBox();
    console.log('Visible:', isVis, 'BoundingBox:', box);
    await squeeze.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join('preview_screenshots', 'dual_pass_audit', '10_intelligence_squeeze_section.png') });
    console.log('Screenshot saved 10_intelligence_squeeze_section.png');
  } else {
    const evalData = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h2, h3, h4, span, p, button')).map(e => e.innerText.trim()).filter(t => t.length > 2 && t.length < 80);
      const matches = texts.filter(t => /squeeze|próżnia|wyjście|liquidity|płynno/i.test(t));
      return { matches, totalMatches: matches.length };
    });
    console.log('Evaluation data:', evalData);
  }
  
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
