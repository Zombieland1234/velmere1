const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT_DIR = path.join(__dirname, '..', 'artifacts', 'visual_audit');

async function runVisualAudit() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Audit (1440x900)
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopCtx.newPage();

  console.log('[1/10] Capturing Home Flagship (/en)...');
  await page.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '01_desktop_home.png'), fullPage: false });

  console.log('[2/10] Capturing Shield Real Markets (/en/shield)...');
  await page.goto('http://localhost:3000/en/shield', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.shield-desktop-grid-row-pass4577:not(.animate-pulse)', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '02_desktop_shield.png'), fullPage: false });

  console.log('[3/10] Capturing Bitcoin Asset Detail Page (/en/shield/assets/bitcoin)...');
  await page.goto('http://localhost:3000/en/shield/assets/bitcoin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, '03_desktop_asset_detail_btc.png'), fullPage: false });

  console.log('[4/10] Capturing Asset Detail Tabs (Analysis & Evidence)...');
  try {
    const analysisTab = page.locator('button:has-text("ANALYSIS")').first();
    if (await analysisTab.count() > 0) {
      await analysisTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '04_desktop_asset_tab_analysis.png'), fullPage: false });
    }
    const evidenceTab = page.locator('button:has-text("EVIDENCE")').first();
    if (await evidenceTab.count() > 0) {
      await evidenceTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, '05_desktop_asset_tab_evidence.png'), fullPage: false });
    }
  } catch (e) {
    console.warn('Tab capture note:', e.message);
  }

  console.log('[5/10] Capturing Audit Lineage (/en/audit-history)...');
  await page.goto('http://localhost:3000/en/audit-history', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '06_desktop_audit_history.png'), fullPage: false });

  console.log('[6/10] Capturing Shield Pro Lockdown (/en/shield-pro)...');
  await page.goto('http://localhost:3000/en/shield-pro', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '07_desktop_shield_pro_lockdown.png'), fullPage: false });

  console.log('[7/10] Capturing Atelier Luxury Collection (/en/atelier)...');
  await page.goto('http://localhost:3000/en/atelier', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, '08_desktop_atelier.png'), fullPage: false });

  console.log('[8/10] Capturing How Risk Is Calculated Modal...');
  try {
    await page.goto('http://localhost:3000/en/security/audits', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    // Find trigger button
    const modalTrigger = page.locator('[data-testid="how-risk-is-calculated-trigger"]').first();
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT_DIR, '09_desktop_modal_risk_telemetry.png'), fullPage: false });
      // close
      const closeBtn = page.locator('button:has-text("CLOSE"), button:has-text("ZAMKNIJ"), button[aria-label="Close"]').first();
      if (await closeBtn.count() > 0) await closeBtn.click();
    }
  } catch (e) {
    console.warn('Modal capture note:', e.message);
  }

  // 2. Mobile Audit (390x844 - iPhone 14 / modern smartphone)
  console.log('[9/10] Capturing Mobile Home & Shield (/en)...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileCtx.newPage();

  await mobilePage.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '10_mobile_home.png'), fullPage: false });

  console.log('[10/10] Capturing Mobile Asset Detail (/en/shield/assets/bitcoin)...');
  await mobilePage.goto('http://localhost:3000/en/shield/assets/bitcoin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, '11_mobile_asset_detail_btc.png'), fullPage: false });

  await browser.close();
  console.log('Visual audit capture complete! Artifacts written to:', OUT_DIR);
}

runVisualAudit().catch((err) => {
  console.error('Visual audit failed:', err);
  process.exit(1);
});
