import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/en/browser", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  console.log("CURRENT URL:", page.url());

  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="lens"], input').first();
  console.log("Filling search input with BTC...");
  await searchInput.fill("BTC");
  await page.waitForTimeout(1500);

  console.log("Pressing Enter to search...");
  await searchInput.press("Enter");
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/browser_search_btc_result.png", fullPage: true });
  console.log("Saved browser_search_btc_result.png");
  
  const bodyText = await page.innerText("body");
  console.log("BODY CONTAINS BITCOIN:", bodyText.includes("Bitcoin"));
  console.log("BODY CONTAINS BTC:", bodyText.includes("BTC"));
  console.log("BODY PREVIEW:", bodyText.slice(0, 500));
  
  await browser.close();
}

run().catch(console.error);
