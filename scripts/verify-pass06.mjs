import { chromium } from "playwright";

async function verifyPass06() {
  console.log("Starting Playwright verification for PAS 06 (Shield Map)...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  // 1. BEFORE SCAN
  console.log("1. Navigating to Shield Map...");
  await page.goto("http://localhost:3000/pl/shield-map", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner if present
  try {
    const cookieBtn = page.locator("button:has-text('Tylko niezbędne'), button:has-text('Akceptuj'), button:has-text('Odrzuć')").first();
    if (await cookieBtn.isVisible({ timeout: 2000 })) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
      console.log("Dismissed cookie banner.");
    }
  } catch (e) {
    console.log("No cookie banner to dismiss.");
  }

  // Hide Next.js dev overlay indicator
  await page.addStyleTag({
    content: "nextjs-portal, #nextjs-dev-tools-button, [data-nextjs-dialog-overlay], button[aria-label*='issue'] { display: none !important; opacity: 0 !important; visibility: hidden !important; }"
  });

  await page.screenshot({ path: "artifacts/pass06_shield_map_before_scan.png", fullPage: false });
  console.log("Captured artifacts/pass06_shield_map_before_scan.png");

  // 2. AUTOCOMPLETE ('b')
  console.log("2. Testing autocomplete for 'b'...");
  const searchInput = page.locator("input[data-testid='shield-map-search']").first();
  await searchInput.click();
  await searchInput.fill("b");
  await page.waitForTimeout(800);

  const suggestionList = page.locator("#shield-map-suggestion-list");
  await suggestionList.waitFor({ state: "visible", timeout: 5000 });
  await page.screenshot({ path: "artifacts/pass06_shield_map_autocomplete.png", fullPage: false });
  console.log("Captured artifacts/pass06_shield_map_autocomplete.png");

  // 3. AFTER SCAN (BTC)
  console.log("3. Testing scan for BTC...");
  await searchInput.fill("BTC");
  await page.waitForTimeout(500);
  const scanBtn = page.locator("button[data-tone='gold']:has-text('Skanuj')").first();
  await scanBtn.click();
  console.log("Clicked scan button for BTC...");
  await page.waitForTimeout(5000);

  const resultArea = page.locator("[data-testid='shield-map-result']");
  await resultArea.waitFor({ state: "visible", timeout: 20000 });
  await page.screenshot({ path: "artifacts/pass06_shield_map_after_scan.png", fullPage: true });
  console.log("Captured artifacts/pass06_shield_map_after_scan.png");

  // 4. SEARCH (Contract Address & EVM)
  console.log("4. Testing search for EVM Contract Address...");
  await searchInput.click();
  await searchInput.fill("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
  await page.waitForTimeout(500);
  await scanBtn.click();
  console.log("Clicked scan button for Contract Address...");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "artifacts/pass06_shield_map_search.png", fullPage: true });
  console.log("Captured artifacts/pass06_shield_map_search.png");

  await browser.close();
  console.log("PAS 06 Playwright verification complete!");
}

verifyPass06().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
