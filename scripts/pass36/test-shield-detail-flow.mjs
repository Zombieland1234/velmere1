import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  console.log("Waiting for shield row selector...");
  await page.waitForSelector('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]', { timeout: 15000 });
  
  const btcRow = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  console.log("Clicking Bitcoin row...");
  await btcRow.click();
  await page.waitForTimeout(2000);

  const modal = page.locator("[role='dialog'], .fixed").first();
  const modalVisible = await modal.isVisible();
  console.log("MODAL VISIBLE:", modalVisible);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_btc_modal_detail.png", fullPage: true });
  console.log("Saved shield_btc_modal_detail.png");

  const modalText = await modal.innerText();
  console.log("MODAL TEXT CONTAINS BITCOIN:", modalText.includes("Bitcoin") || modalText.includes("BTC"));
  console.log("MODAL PREVIEW:\n", modalText.slice(0, 600));

  await browser.close();
}

run().catch(console.error);
