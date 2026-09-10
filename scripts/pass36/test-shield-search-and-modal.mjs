import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting for table rows...");
  await page.waitForSelector('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]', { timeout: 20000 });

  const searchInput = page.locator('input[placeholder*="Search token"]').first();
  console.log("Filtering table by 'SOL'...");
  await searchInput.fill("SOL");
  await page.waitForTimeout(1000);

  const solRow = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]').first();
  const solText = (await solRow.innerText()).replace(/\s+/g, " ");
  console.log("FILTERED ROW 1:", solText);

  console.log("Clicking SOL row to open asset modal...");
  await solRow.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_sol_modal.png", fullPage: false });
  console.log("Saved shield_sol_modal.png");

  const modal = page.locator("[role='dialog'], .fixed").first();
  const modalText = await modal.innerText();
  console.log("MODAL TEXT HAS SOLANA:", modalText.includes("Solana") || modalText.includes("SOL"));

  await browser.close();
}

run().catch(console.error);
