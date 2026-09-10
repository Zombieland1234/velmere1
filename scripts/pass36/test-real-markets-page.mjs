import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting for real markets UI...");
  await page.waitForTimeout(6000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/real_markets_page.png", fullPage: false });
  console.log("Saved real_markets_page.png");

  const text = await page.innerText("body");
  console.log("REAL MARKETS TEXT PREVIEW:\n", text.slice(0, 500));

  await browser.close();
}

run().catch(console.error);
