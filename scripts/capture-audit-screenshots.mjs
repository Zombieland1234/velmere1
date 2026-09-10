import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = "C:\\Users\\marci\\Desktop\\Nowy folder\\naprawa";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("=== STARTING FULL AUDIT SCREENSHOT CAPTURE ===");

  // 1. Home Page
  console.log("[1/11] Capturing Home page...");
  await page.goto(`${BASE}/pl`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_01_home_live.png"), fullPage: false });

  // 2. Browser Page + Bitcoin Cash
  console.log("[2/11] Capturing Browser with Bitcoin Cash loaded...");
  await page.goto(`${BASE}/pl/browser`, { waitUntil: "networkidle", timeout: 25000 });
  const bchCard = page.locator(".velmere-lens-discovery-card").first();
  if ((await bchCard.count()) > 0) {
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/search?q=BCH") && res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);
    await bchCard.click();
    await responsePromise;
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "audit_02_browser_bch_live.png"), fullPage: false });

  // 3. Real Markets
  console.log("[3/11] Capturing Real Markets table...");
  await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_03_real_markets_live.png"), fullPage: false });

  // 4. Real Markets Asset Detail Modal (Overview tab with Candlestick Chart)
  console.log("[4/11] Opening Asset Detail Modal (Overview tab)...");
  const firstRow = page.locator("div.realmarkets-pass578-grid[aria-label]").first();
  if ((await firstRow.count()) > 0) {
    await firstRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "audit_04_modal_overview_chart.png"), fullPage: false });

    // 5. Asset Detail Modal - Market Impact tab
    console.log("[5/11] Switching to Market Impact tab...");
    const impactTab = page.locator("#vlm-asset-detail-tab-market-impact");
    if ((await impactTab.count()) > 0) {
      await impactTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, "audit_05_modal_market_impact.png"), fullPage: false });
    }

    // 6. Asset Detail Modal - Whale Watch (Large Players) tab
    console.log("[6/11] Switching to Whale Watch (Large Players) tab...");
    const whaleTab = page.locator("#vlm-asset-detail-tab-whale-watch");
    if ((await whaleTab.count()) > 0) {
      await whaleTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT_DIR, "audit_06_modal_large_players.png"), fullPage: false });
    }

    // Close modal
    const closeBtn = page.locator(".vlm-asset-detail-close").first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 7. Shield Map Page
  console.log("[7/11] Capturing Shield Map page...");
  await page.goto(`${BASE}/pl/shield-map`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_07_shield_map_live.png"), fullPage: false });

  // 8. Shield Pro Page
  console.log("[8/11] Capturing Shield Pro page...");
  await page.goto(`${BASE}/pl/shield-pro`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_08_shield_pro_live.png"), fullPage: false });

  // 9. Security Audits Page
  console.log("[9/11] Capturing Security Audits page...");
  await page.goto(`${BASE}/pl/security/audits`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_09_security_audits_clean.png"), fullPage: false });

  // 10. Canonical Audit Report Page
  console.log("[10/11] Capturing Canonical Audit Report page...");
  await page.goto(
    `${BASE}/pl/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c?tier=basic&address=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c&name=WBNB`,
    { waitUntil: "networkidle", timeout: 25000 }
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_10_canonical_audit_report.png"), fullPage: false });

  // 11. Shop Page
  console.log("[11/11] Capturing Shop page...");
  await page.goto(`${BASE}/pl/shop`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "audit_11_shop_coming_soon.png"), fullPage: false });

  await browser.close();
  console.log("\n=== ALL 11 AUDIT SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

main().catch(console.error);
