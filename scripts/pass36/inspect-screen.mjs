import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';

async function inspectScreen() {
  console.log('=== §110 REAL USER SCREEN INVESTIGATION ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const networkLog = [];
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkLog.push({ type: 'REQ', method: req.method(), url: req.url() });
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      let bodyText = '';
      try { bodyText = (await res.text()).slice(0, 300); } catch (e) {}
      networkLog.push({ type: 'RES', status: res.status(), url: res.url(), body: bodyText });
      console.log(`[API ${res.status()}] ${res.request().method()} ${res.url()} -> ${bodyText.slice(0, 120)}`);
    }
  });
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  fs.mkdirSync('artifacts/forensic/screen_investigation', { recursive: true });

  // 1. SHIELD
  console.log('\n--- 1. OPENING SHIELD (/en/shield) ---');
  await page.goto(`${BASE}/en/shield`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'artifacts/forensic/screen_investigation/01_shield_initial.png', fullPage: true });
  
  // Inspect visible cards, rows, table
  const shieldCards = await page.locator('[data-testid], table tr, .grid > div, [role="row"]').count();
  const shieldText = await page.innerText('main').catch(() => 'NO MAIN');
  console.log('Shield text excerpt (first 500 chars):');
  console.log(shieldText.replace(/\s+/g, ' ').slice(0, 500));
  
  // Try searching in Shield
  console.log('Testing search on Shield...');
  const shieldInput = page.locator('input[type="text"], input[type="search"], input').first();
  if (await shieldInput.isVisible().catch(() => false)) {
    console.log('Found input on Shield, typing BTC...');
    await shieldInput.fill('BTC');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'artifacts/forensic/screen_investigation/02_shield_search_btc.png', fullPage: true });
    const afterSearchText = await page.innerText('main').catch(() => '');
    console.log('Shield after typing BTC excerpt:');
    console.log(afterSearchText.replace(/\s+/g, ' ').slice(0, 400));
  } else {
    console.log('No visible search input on Shield!');
  }

  // 2. SHIELD PRO
  console.log('\n--- 2. OPENING SHIELD PRO (/en/shield-pro) ---');
  await page.goto(`${BASE}/en/shield-pro`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'artifacts/forensic/screen_investigation/03_shield_pro_initial.png', fullPage: true });
  const shieldProText = await page.innerText('main').catch(() => 'NO MAIN');
  console.log('Shield Pro text excerpt (first 500 chars):');
  console.log(shieldProText.replace(/\s+/g, ' ').slice(0, 500));

  // 3. REAL MARKETS
  console.log('\n--- 3. OPENING REAL MARKETS (/en/real-markets) ---');
  await page.goto(`${BASE}/en/real-markets`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'artifacts/forensic/screen_investigation/04_real_markets_initial.png', fullPage: true });
  const rmText = await page.innerText('main').catch(() => 'NO MAIN');
  console.log('Real Markets text excerpt (first 500 chars):');
  console.log(rmText.replace(/\s+/g, ' ').slice(0, 500));

  // Try clicking or searching in Real Markets
  const rmInput = page.locator('input[type="text"], input[type="search"], input').first();
  if (await rmInput.isVisible().catch(() => false)) {
    console.log('Found input on Real Markets, typing BTC...');
    await rmInput.fill('BTC');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'artifacts/forensic/screen_investigation/05_real_markets_search_btc.png', fullPage: true });
  }

  // 4. BROWSER
  console.log('\n--- 4. OPENING BROWSER (/en/browser) ---');
  await page.goto(`${BASE}/en/browser`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'artifacts/forensic/screen_investigation/06_browser_initial.png', fullPage: true });
  const browserText = await page.innerText('body').catch(() => 'NO BODY');
  console.log('Browser text excerpt (first 500 chars):');
  console.log(browserText.replace(/\s+/g, ' ').slice(0, 500));

  // Search in Browser workflow
  console.log('Attempting search workflow in Browser: click search, type BTC, inspect suggestions...');
  const bSearchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="search" i], input').first();
  if (await bSearchInput.isVisible().catch(() => false)) {
    console.log('Found search input in Browser!');
    await bSearchInput.click();
    await bSearchInput.fill('BTC');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'artifacts/forensic/screen_investigation/07_browser_typed_btc.png', fullPage: true });

    // Look for dropdown, suggestions, list items, or buttons
    const suggestions = await page.locator('[role="listbox"], [role="option"], ul li, .suggestion, a:has-text("BTC"), button:has-text("BTC")').allInnerTexts().catch(() => []);
    console.log('Browser suggestions found:', suggestions);

    // Try pressing Enter
    await bSearchInput.press('Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'artifacts/forensic/screen_investigation/08_browser_pressed_enter.png', fullPage: true });
    const afterEnterText = await page.innerText('body').catch(() => '');
    console.log('Browser text after Enter:');
    console.log(afterEnterText.replace(/\s+/g, ' ').slice(0, 500));
  } else {
    console.log('No search input found in Browser page!');
  }

  fs.writeFileSync('artifacts/forensic/screen_investigation/network_log.json', JSON.stringify(networkLog, null, 2));
  await browser.close();
  console.log('=== SCREEN INVESTIGATION COMPLETED ===');
}

inspectScreen().catch(err => {
  console.error('Fatal error during screen inspection:', err);
  process.exit(1);
});
