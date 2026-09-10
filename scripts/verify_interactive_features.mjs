import { chromium } from 'playwright';

async function run() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const errors = [];
  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err.message);
    errors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text());
      errors.push(msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000/pl/shield/assets/bitcoin...');
  await page.goto('http://localhost:3000/pl/shield/assets/bitcoin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- TESTING TIMEFRAMES ---');
  const tfs = ['1W', '1M', '3M', '1Y', 'ALL', '1D'];
  for (const tf of tfs) {
    console.log('Clicking timeframe:', tf);
    await page.getByRole('button', { name: tf, exact: true }).first().click();
    await page.waitForTimeout(300);
  }

  console.log('--- TESTING CENA / VOLUME ---');
  await page.getByRole('button', { name: 'VOLUME', exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'CENA', exact: true }).first().click();
  await page.waitForTimeout(300);

  console.log('--- TESTING BASIC CARD & 10 SIGNALS ---');
  await page.locator('text=BASIC').first().click();
  await page.waitForTimeout(500);
  const basicModalTitle = await page.locator('text=Analiza Podstawowa (Basic Tier)').count();
  console.log('Basic modal opened:', basicModalTitle > 0);
  const basicSignals10 = await page.locator('text=10 / 10').count();
  console.log('Basic 10/10 indicator present:', basicSignals10 > 0);
  
  console.log('Testing simulation switch: Partial discount');
  await page.locator('text=2. Częściowy ubytek').click();
  await page.waitForTimeout(300);
  console.log('Testing simulation switch: Stop-Sell');
  await page.locator('text=3. Brak bajtkodu').click();
  await page.waitForTimeout(300);
  console.log('Testing simulation switch: Full delivery');
  await page.locator('text=1. Pełna dostawa').click();
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.waitForTimeout(400);

  console.log('--- TESTING PRO CARD & 14 SIGNALS ---');
  await page.locator('text=PRO').first().click();
  await page.waitForTimeout(500);
  const proModalTitle = await page.locator('text=Analiza Profesjonalna (Pro Terminal)').count();
  console.log('Pro modal opened:', proModalTitle > 0);
  const proSignals14 = await page.locator('text=14 / 14').count();
  console.log('Pro 14/14 indicator present:', proSignals14 > 0);
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.waitForTimeout(400);

  console.log('--- TESTING ADVANCED CARD & 20 SIGNALS ---');
  await page.locator('text=ADVANCED').first().click();
  await page.waitForTimeout(500);
  const advModalTitle = await page.locator('text=Analiza Zaawansowana (Institutional Advanced)').count();
  console.log('Advanced modal opened:', advModalTitle > 0);
  const advSignals20 = await page.locator('text=20 / 20').count();
  console.log('Advanced 20/20 indicator present:', advSignals20 > 0);
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.waitForTimeout(400);

  console.log('--- TESTING MARKET IMPACT MODAL ---');
  await page.locator('text=Market Impact').first().click();
  await page.waitForTimeout(500);
  const miModalTitle = await page.locator('text=Market Impact & Płynność Arkusza').count();
  console.log('Market impact modal opened:', miModalTitle > 0);
  await page.getByRole('button', { name: "$500k" }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.waitForTimeout(400);

  console.log('--- TESTING WHALE WATCH MODAL ---');
  await page.locator('text=Whale Watch').first().click();
  await page.waitForTimeout(500);
  const wwModalTitle = await page.locator('text=Whale Watch & Radar Transakcji').count();
  console.log('Whale watch modal opened:', wwModalTitle > 0);
  await page.getByRole('button', { name: 'Odpływy (Akumulacja)' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Wpływy' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Wszystkie' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.waitForTimeout(400);

  console.log('Taking full page screenshot...');
  await page.screenshot({ path: 'artifacts/interactive_verification.png', fullPage: true });

  await browser.close();

  console.log('=== TEST RESULT ===');
  console.log('Total Errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED WITH 0 ERRORS!');
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
