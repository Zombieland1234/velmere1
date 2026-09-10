import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://localhost:3000/en/shield-map ...");
  await page.goto("http://localhost:3000/en/shield-map", { waitUntil: "networkidle" });

  console.log("Looking for BTC quick button...");
  const btcButton = page.locator("button:has-text('BTC')").first();
  await btcButton.waitFor({ state: "visible", timeout: 10000 });
  console.log("Clicking BTC quick scan button...");
  await btcButton.click();

  console.log("Waiting for scan resolution...");
  await page.waitForTimeout(4000);

  const errorAlert = page.locator("text=shield_customer_data_delivery_unavailable");
  const errorCount = await errorAlert.count();
  console.log("Error count on screen:", errorCount);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_map_btc_scanned.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/shield_map_btc_scanned.png");

  const content = await page.content();
  const hasSupplyLane = content.includes("Supply") || content.includes("supply");
  const hasBitcoin = content.includes("Bitcoin");
  console.log("Page has Bitcoin:", hasBitcoin);
  console.log("Page has Supply lane:", hasSupplyLane);

  await browser.close();
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
