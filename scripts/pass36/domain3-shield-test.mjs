import { chromium } from 'playwright';
async function run() {
  console.log('DOMAIN 3: SHIELD E2E CUSTOMER WORKFLOW');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  console.log('Navigating to /en/shield');
  const response = await page.goto('http://localhost:3000/en/shield', { waitUntil: 'domcontentloaded' });
  console.log('Response status:', response.status());
  const mainText = await page.locator('main').first().innerText();
  console.log('--- Main Content Excerpt ---');
  console.log(mainText.slice(0, 500).replace(/\n/g, ' | '));
  await browser.close();
}
run().catch(console.error);
