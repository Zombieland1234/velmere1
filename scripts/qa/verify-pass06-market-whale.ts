import { chromium } from "playwright";

async function main() {
  console.log("=== PASS_06 VERIFICATION: MARKET IMPACT & WHALE WATCH MODULES ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Shield BNB: Market Impact
    console.log("1. Testing Market Impact on /en/shield/assets/bnb...");
    await page.goto("http://localhost:3000/en/shield/assets/bnb", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(600);

    // Click Market Impact card
    const marketImpactBtn = page.locator("button:has-text('Pokaż Symulator'), button:has-text('Launch Simulator'), [data-testid='analysis-card-btn-market_impact']").first();
    await marketImpactBtn.click();
    await page.waitForTimeout(500);

    // Select $500k order size
    const order500kBtn = page.locator("button:has-text('$500k')").first();
    if (await order500kBtn.isVisible()) {
      await order500kBtn.click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: "artifacts/pass06_market_impact_verified.png" });
    console.log("Saved screenshot: artifacts/pass06_market_impact_verified.png");

    // Close Market Impact modal
    await page.locator("button:has-text('Zamknij'), button:has-text('Close')").last().click();
    await page.waitForTimeout(400);

    // 2. Shield BNB: Whale Watch
    console.log("2. Testing Whale Watch Radar on /en/shield/assets/bnb...");
    const whaleBtn = page.locator("button:has-text('Pokaż Radar'), button:has-text('Show Radar'), [data-testid='analysis-card-btn-whale_watch']").first();
    await whaleBtn.click();
    await page.waitForTimeout(500);

    // Click OUTFLOW filter
    const outflowBtn = page.locator("button:has-text('Odpływy (Outflow)'), button:has-text('Odpływy'), [data-testid='whale-filter-outflow']").first();
    if (await outflowBtn.isVisible()) {
      await outflowBtn.click();
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: "artifacts/pass06_whale_watch_verified.png" });
    console.log("Saved screenshot: artifacts/pass06_whale_watch_verified.png");

    // Close Whale Watch modal
    await page.locator("button:has-text('Zamknij'), button:has-text('Close')").last().click();
    await page.waitForTimeout(400);

    // 3. Real Markets AAPL: Whale Watch
    console.log("3. Testing Whale Watch Radar on /en/real-markets/assets/aapl...");
    await page.goto("http://localhost:3000/en/real-markets/assets/aapl", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(600);

    const whaleAaplBtn = page.locator("button:has-text('Pokaż Radar'), button:has-text('Show Radar'), [data-testid='analysis-card-btn-whale_watch']").first();
    await whaleAaplBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "artifacts/pass06_whale_watch_real_markets.png" });
    console.log("Saved screenshot: artifacts/pass06_whale_watch_real_markets.png");

    console.log("=== PASS_06 VERIFICATION SUCCESSFUL ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
