import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    console.log("Dismissing cookie banner...");
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  const firstRow = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  console.log("Clicking Bitcoin grid row...");
  await firstRow.click();
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_btc_modal.png", fullPage: true });
  console.log("Modal screenshot saved to artifacts/forensic/screen_investigation/shield_btc_modal.png");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
