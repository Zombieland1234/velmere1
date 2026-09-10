import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting 12s for catalog to load...");
  await page.waitForTimeout(12000);

  const rowCount = await page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').count();
  console.log("SHIELD ROWS COUNT:", rowCount);

  if (rowCount > 0) {
    const firstRowText = await page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first().innerText();
    console.log("FIRST ROW TEXT:\n", firstRowText);
    await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_table_loaded.png", fullPage: false });
    console.log("Saved shield_table_loaded.png");
  } else {
    const text = await page.innerText("body");
    console.log("BODY PREVIEW:\n", text.slice(0, 300));
  }
  await browser.close();
}

run().catch(console.error);
