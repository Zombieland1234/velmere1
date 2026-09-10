import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleLogs = [];
  page.on("console", msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  
  console.log("Navigating to http://localhost:3000/en/browser...");
  await page.goto("http://localhost:3000/en/browser", { waitUntil: "networkidle" });
  
  console.log("Current URL after redirect:", page.url());
  
  const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="search"]').first();
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  console.log("Search input found!");
  
  console.log("Typing 'BTC'...");
  await searchInput.fill("BTC");
  await page.waitForTimeout(1000);
  
  const suggestions = page.locator('[role="listbox"], [role="option"], [data-lens-suggestion], button:has-text("Bitcoin"), div:has-text("Bitcoin")');
  const count = await suggestions.count();
  console.log("Suggestions/matches count:", count);
  
  console.log("Submitting search for BTC...");
  await searchInput.press("Enter");
  await page.waitForTimeout(2000);
  
  const bitcoinCard = page.locator('text=Bitcoin').first();
  const isVisible = await bitcoinCard.isVisible();
  console.log("Bitcoin visible on page:", isVisible);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/browser_btc_search_repaired.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/browser_btc_search_repaired.png");
  
  await browser.close();
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
