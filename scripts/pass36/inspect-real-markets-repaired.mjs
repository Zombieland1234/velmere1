import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://localhost:3000/en/real-markets...");
  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    console.log("Dismissing cookie banner...");
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  const aaplItem = page.locator('text=AAPL, text=Apple').first();
  const isAaplVisible = await aaplItem.isVisible();
  console.log("AAPL visible on Real Markets:", isAaplVisible);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/real_markets_repaired.png", fullPage: true });
  console.log("Real Markets screenshot saved to artifacts/forensic/screen_investigation/real_markets_repaired.png");
  
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
