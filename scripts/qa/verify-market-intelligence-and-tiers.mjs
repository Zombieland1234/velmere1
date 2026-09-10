import { chromium } from "playwright";
import path from "node:path";

const OUT_DIR = "c:\\Users\\marci\\Desktop\\Nowy folder\\naprawa";

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => {
    console.error("Page error:", err.message);
    errors.push(err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("Console error:", msg.text());
      errors.push(msg.text());
    }
  });

  console.log("Navigating to http://localhost:3000/pl/real-markets...");
  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click row to open modal
  console.log("Opening AssetDetailModal...");
  const row = page.locator(".realmarkets-pass578-grid").nth(1);
  await row.click();
  await page.waitForTimeout(1500);

  // Click Market Impact tab by exact id
  console.log("Clicking #vlm-asset-detail-tab-market-impact...");
  const impactTab = page.locator("#vlm-asset-detail-tab-market-impact");
  await impactTab.click();
  await page.waitForTimeout(1500);

  // Click $100K pill if visible
  const pill100k = page.locator("button").filter({ hasText: "$100K" }).first();
  if (await pill100k.isVisible()) {
    console.log("Clicking $100K pill...");
    await pill100k.click();
    await page.waitForTimeout(500);
  }

  // Click BUY direction if visible
  const buyBtn = page.locator("button").filter({ hasText: /^Kup$|^Buy$/i }).first();
  if (await buyBtn.isVisible()) {
    console.log("Clicking BUY button...");
    await buyBtn.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(OUT_DIR, "market_impact_sleek.png") });
  console.log("Saved market_impact_sleek.png");

  // Click Whale Watch tab by exact id
  console.log("Clicking #vlm-asset-detail-tab-whale-watch...");
  const whaleTab = page.locator("#vlm-asset-detail-tab-whale-watch");
  await whaleTab.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(OUT_DIR, "whale_watch_sleek.png") });
  console.log("Saved whale_watch_sleek.png");

  // Click VLM Analysis tab by exact id
  console.log("Clicking #vlm-asset-detail-tab-analysis...");
  const analysisTab = page.locator("#vlm-asset-detail-tab-analysis");
  if (await analysisTab.isVisible()) {
    await analysisTab.click();
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(OUT_DIR, "vlm_tiers_cards.png") });
    console.log("Saved vlm_tiers_cards.png");

    // Click PRO tier to test 14 signals
    const proCard = page.locator("button.vlm-analysis-tier-card[data-tier='pro']");
    if (await proCard.isVisible()) {
      console.log("Clicking PRO tier analysis...");
      await proCard.click();
      await page.waitForTimeout(6500); // wait for completion
      await page.screenshot({ path: path.join(OUT_DIR, "vlm_pro_signals.png") });
      console.log("Saved vlm_pro_signals.png");
    }
  }

  await browser.close();
  console.log("All verifications completed successfully! Total errors encountered:", errors.length);
  if (errors.length > 0) {
    console.log("Errors detail:", errors);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
