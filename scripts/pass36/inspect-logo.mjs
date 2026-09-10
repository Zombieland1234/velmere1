import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 30000 });
  const btcRow = page.locator('tr:has-text("Bitcoin")').first();
  const logo = btcRow.locator('.velmere-asset-logo');
  console.log("OUTER HTML:\n", await logo.evaluate(el => el.outerHTML));
  await browser.close();
}

run().catch(console.error);
