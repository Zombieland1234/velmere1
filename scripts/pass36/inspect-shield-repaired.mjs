import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://localhost:3000/en/shield...");
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  
  const btcRow = page.locator('text=BTC').first();
  const isBtcVisible = await btcRow.isVisible();
  console.log("Shield BTC visible:", isBtcVisible);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_repaired.png", fullPage: true });
  console.log("Shield screenshot saved!");
  
  console.log("Navigating to http://localhost:3000/en/shield-pro...");
  await page.goto("http://localhost:3000/en/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  
  const proBtc = page.locator('text=BTC').first();
  const isProBtcVisible = await proBtc.isVisible();
  console.log("Shield Pro BTC visible:", isProBtcVisible);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_repaired.png", fullPage: true });
  console.log("Shield Pro screenshot saved!");
  
  await browser.close();
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
