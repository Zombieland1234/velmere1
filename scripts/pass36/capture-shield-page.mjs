import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "domcontentloaded" });
  const cookieBtn = page.locator('button:has-text("Tylko niezbędne"), button:has-text("Akceptuj")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();
  await page.waitForSelector('.shield-coin-logo-pass2382, .velmere-asset-logo', { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_page_logos_verified.png" });
  console.log("Saved shield_page_logos_verified.png");
  await browser.close();
}

run().catch(console.error);
