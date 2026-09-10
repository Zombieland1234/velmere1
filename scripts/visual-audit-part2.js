const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT_DIR = 'c:\\Users\\marci\\Desktop\\Nowy folder\\artifacts\\visual_audit';

async function runVisualAuditPart2() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await desktopCtx.newPage();

  console.log('[1/8] Capturing Asset Browser (/en/browser)...');
  try {
    await page.goto('http://localhost:3000/en/browser', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '12_desktop_browser.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/browser:', e.message);
  }

  console.log('[2/8] Capturing Intelligence Suite (/en/intelligence)...');
  try {
    await page.goto('http://localhost:3000/en/intelligence', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '13_desktop_intelligence.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/intelligence:', e.message);
  }

  console.log('[3/8] Capturing Risk Methodology (/en/risk-methodology)...');
  try {
    await page.goto('http://localhost:3000/en/risk-methodology', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '14_desktop_risk_methodology.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/risk-methodology:', e.message);
  }

  console.log('[4/8] Capturing Shield Map (/en/shield-map)...');
  try {
    await page.goto('http://localhost:3000/en/shield-map', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, '15_desktop_shield_map.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/shield-map:', e.message);
  }

  console.log('[5/8] Capturing Security Hub (/en/security)...');
  try {
    await page.goto('http://localhost:3000/en/security', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '16_desktop_security.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/security:', e.message);
  }

  console.log('[6/8] Capturing FAQ (/en/faq)...');
  try {
    await page.goto('http://localhost:3000/en/faq', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '17_desktop_faq.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/faq:', e.message);
  }

  console.log('[7/8] Capturing VLM Token Governance (/en/vlm-token)...');
  try {
    await page.goto('http://localhost:3000/en/vlm-token', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '18_desktop_vlm_token.png'), fullPage: false });
  } catch (e) {
    console.error('Error on /en/vlm-token:', e.message);
  }

  // Mobile tests
  console.log('[8/8] Capturing Mobile Shield & Audit History...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileCtx.newPage();

  try {
    await mobilePage.goto('http://localhost:3000/en/shield', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForSelector('.shield-desktop-grid-row-pass4577:not(.animate-pulse), .space-y-3', { timeout: 8000 }).catch(() => {});
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(OUT_DIR, '19_mobile_shield.png'), fullPage: false });
    
    await mobilePage.goto('http://localhost:3000/en/audit-history', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(OUT_DIR, '20_mobile_audit_history.png'), fullPage: false });
  } catch (e) {
    console.error('Error on mobile captures:', e.message);
  }

  await browser.close();
  console.log('Visual audit part 2 complete!');
}

runVisualAuditPart2().catch(console.error);
