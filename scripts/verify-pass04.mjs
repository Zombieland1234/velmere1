import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("artifacts", { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/pl/search (Browser)...");
  await page.goto("http://localhost:3000/pl/search", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // Dismiss cookie banner if present
  const cookieBtn = page.locator("button").filter({ hasText: /akceptuj|tylko niezbędne/i }).first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(400);
  }

  // 1. Initial screen capture: Check clean placeholder, SHOP in navbar, animated shield
  console.log("Capturing initial Browser screen...");
  await page.screenshot({ path: "artifacts/pass04_browser_initial.png" });
  console.log("Captured artifacts/pass04_browser_initial.png");

  // Verify SHOP link exists in navbar
  const shopLink = page.locator("nav[aria-label] a, .velmere-desktop-nav a").filter({ hasText: /^SHOP$/i }).first();
  const isShopInNav = await shopLink.isVisible();
  console.log("SHOP visible in desktop nav (should be true):", isShopInNav);

  // Verify placeholder
  const searchInput = page.locator("input[data-testid='lens-search-input'], input[role='combobox']").first();
  const placeholderText = await searchInput.getAttribute("placeholder");
  console.log("Search input placeholder:", placeholderText);

  // 2. Type "BTC" and search
  console.log("Searching for BTC...");
  await searchInput.fill("BTC");
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);

  // Capture search results
  console.log("Capturing search results...");
  await page.screenshot({ path: "artifacts/pass04_browser_search_btc.png" });
  console.log("Captured artifacts/pass04_browser_search_btc.png");

  // 3. Test interactive timeframes: 1H, 24H, 30D
  console.log("Testing interactive timeframes...");
  const tf1hBtn = page.locator("button").filter({ hasText: /^1h$/i }).first();
  if (await tf1hBtn.isVisible()) {
    console.log("Clicking 1H timeframe...");
    await tf1hBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "artifacts/pass04_browser_tf_1h.png" });
    console.log("Captured artifacts/pass04_browser_tf_1h.png");
  }

  const tf30dBtn = page.locator("button").filter({ hasText: /^30d$/i }).first();
  if (await tf30dBtn.isVisible()) {
    console.log("Clicking 30D timeframe...");
    await tf30dBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "artifacts/pass04_browser_tf_30d.png" });
    console.log("Captured artifacts/pass04_browser_tf_30d.png");
  }

  // 4. Test SHOP navigation link
  console.log("Testing SHOP navigation link click...");
  if (await shopLink.isVisible()) {
    await shopLink.click();
    await page.waitForTimeout(2000);
    console.log("Current URL after clicking SHOP:", page.url());
    await page.screenshot({ path: "artifacts/pass04_shop_nav.png" });
    console.log("Captured artifacts/pass04_shop_nav.png");
  }

  await browser.close();
  console.log("PAS 04 Playwright verification finished successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
