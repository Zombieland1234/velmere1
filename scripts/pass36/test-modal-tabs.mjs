import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  // Click first row (Bitcoin)
  const btcRow = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  console.log("Clicking BTC row...");
  await btcRow.click();
  await page.waitForTimeout(1500);
  
  // Click MARKET IMPACT tab
  const impactTab = page.locator('button[role="tab"]:has-text("MARKET IMPACT"), button:has-text("MARKET IMPACT")').first();
  if (await impactTab.isVisible()) {
    console.log("Clicking MARKET IMPACT tab...");
    await impactTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/forensic/screen_investigation/modal_market_impact_tab.png" });
    console.log("Market impact screenshot saved!");
  }
  
  // Click WHALE WATCH tab
  const whaleTab = page.locator('button[role="tab"]:has-text("WHALE WATCH"), button:has-text("WHALE WATCH")').first();
  if (await whaleTab.isVisible()) {
    console.log("Clicking WHALE WATCH tab...");
    await whaleTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/forensic/screen_investigation/modal_whale_watch_tab.png" });
    console.log("Whale watch screenshot saved!");
  }
  
  await browser.close();
}

run().catch(console.error);
