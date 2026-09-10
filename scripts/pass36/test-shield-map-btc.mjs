import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/shield-map", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  // Click quick button BTC
  const btcQuickBtn = page.locator('button:has-text("BTC")').first();
  if (await btcQuickBtn.isVisible()) {
    console.log("Clicking BTC quick button...");
    await btcQuickBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_map_btc.png", fullPage: true });
    console.log("Shield map BTC screenshot saved!");
  }
  
  await browser.close();
}

run().catch(console.error);
