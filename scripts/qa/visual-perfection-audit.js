const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../../artifacts/visual_audit');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES_TO_AUDIT = [
  { name: '01_landing_hero', url: 'http://localhost:3000/en', clip: { x: 0, y: 0, width: 1440, height: 900 } },
  { name: '01_landing_full', url: 'http://localhost:3000/en', fullPage: true },
  { name: '02_real_markets_overview', url: 'http://localhost:3000/en/real-markets', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '03_asset_detail_nvda', url: 'http://localhost:3000/en/real-markets/assets/NVDA', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '03_asset_detail_btc', url: 'http://localhost:3000/en/shield/assets/BTC', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '04_shield_terminal', url: 'http://localhost:3000/en/shield', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '05_account_page', url: 'http://localhost:3000/en/account', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '06_risk_management', url: 'http://localhost:3000/en/risk-management', clip: { x: 0, y: 0, width: 1440, height: 950 } },
  { name: '07_verified_audits', url: 'http://localhost:3000/en/verified-audits', clip: { x: 0, y: 0, width: 1440, height: 950 } }
];

(async () => {
  console.log('--- Launching Visual Perfection Audit Suite ---');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  for (const item of PAGES_TO_AUDIT) {
    console.log(`Auditing: ${item.name} -> ${item.url}`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Handle cookie consent if present
      const cookieBtn = page.locator('button', { hasText: /ALLOW ALL|Accept/i });
      if (await cookieBtn.isVisible()) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }

      const filePath = path.join(OUTPUT_DIR, `${item.name}.png`);
      if (item.clip) {
        await page.screenshot({ path: filePath, clip: item.clip });
      } else {
        await page.screenshot({ path: filePath, fullPage: item.fullPage });
      }
      console.log(`  Saved: ${filePath}`);
    } catch (err) {
      console.error(`  Error capturing ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log('--- Visual Audit Capture Complete ---');
})();
