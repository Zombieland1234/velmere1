import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    console.log("Dismissing cookie banner...");
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  const appleRow = page.locator('div[data-pass4467-row-click-target="realmarkets-asset-modal"]').first();
  console.log("Found first Real Markets row, clicking...");
  await appleRow.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/real_markets_apple_modal.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/real_markets_apple_modal.png");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
