import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", msg => {
    if (msg.text().includes("Shield") || msg.text().includes("catalog") || msg.text().includes("ROW")) {
      console.log("[BROWSER CONSOLE]:", msg.text());
    }
  });

  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  console.log("Waiting for shield row selector (up to 35s)...");
  await page.waitForSelector('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]', { timeout: 35000 });
  
  const btcRow = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  console.log("Found Bitcoin row! Text:", (await btcRow.innerText()).slice(0, 100));
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_table_with_prices.png", fullPage: false });
  console.log("Saved shield_table_with_prices.png");

  console.log("Clicking Bitcoin row to open modal...");
  await btcRow.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_btc_modal_open.png", fullPage: false });
  console.log("Saved shield_btc_modal_open.png");

  await browser.close();
}

run().catch(console.error);
