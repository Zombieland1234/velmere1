import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  
  // Wait for and click cookie banner
  const cookieBtn = page.locator('button').filter({ hasText: /akceptuj/i }).first();
  await cookieBtn.waitFor({ timeout: 10000 }).catch(() => {});
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    console.log("Clicked cookie banner!");
  }

  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 35000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_uncovered.png", fullPage: false });
  console.log("Saved shield_pro_uncovered.png");

  // Also do /pl/shield
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 35000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_uncovered.png", fullPage: false });
  console.log("Saved shield_uncovered.png");

  await browser.close();
}

run().catch(console.error);
