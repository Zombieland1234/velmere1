import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", msg => {
    if (msg.type() === "error") console.log("[BROWSER ERROR]:", msg.text());
  });

  await page.goto("http://localhost:3000/pl/market-integrity", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Tylko niezbędne"), button:has-text("Akceptuj"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting for selector...");
  await page.waitForSelector('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]', { timeout: 25000 });
  
  const rows = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]');
  const count = await rows.count();
  console.log("SHIELD ROWS COUNT:", count);

  for (let i = 0; i < Math.min(5, count); i++) {
    const text = (await rows.nth(i).innerText()).replace(/\s+/g, " ");
    console.log(`ROW ${i}:`, text);
  }

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_risk_table_verified.png", fullPage: false });
  console.log("Saved shield_risk_table_verified.png");

  await browser.close();
}

run().catch(console.error);
