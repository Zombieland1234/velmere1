import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.resolve(process.cwd(), "reports", "screenshots");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function initConsentScript() {
  const now = new Date();
  const decidedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const consent = {
    schemaVersion: "velmere.browser-consent-choice.v2",
    policyVersion: "2026-07-30",
    decidedAt,
    expiresAt,
    necessary: true,
    analytics: true,
    marketing: true,
    source: "user_choice",
    legalProof: false,
    serverRecorded: false,
  };
  window.localStorage.setItem("velmere_cookie_consent_v2", JSON.stringify(consent));
}

async function run() {
  console.log("Starting visual verification run for Section 81 screenshot pack...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  await context.addInitScript(initConsentScript);

  const page = await context.newPage();

  // 01. Lineage Page
  console.log("01. Visiting Lineage / Audit History...");
  await page.goto(`${BASE_URL}/en/audit-history`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "01_lineage.png"), fullPage: false });
  console.log("Saved 01_lineage.png");

  // 02. What Changed Modal / Drawer
  console.log("02. Opening 'What Changed?' Differential Snapshot Drawer...");
  const whatChangedBtn = await page.$("button:has-text('What Changed?')");
  if (whatChangedBtn) {
    await whatChangedBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "02_what_changed.png"), fullPage: false });
  console.log("Saved 02_what_changed.png");

  // Close drawer
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 03. Shield Asset Detail (USDT)
  console.log("03. Visiting Shield Asset Detail (USDT)...");
  await page.goto(`${BASE_URL}/en/shield/assets/usdt`, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await page.waitForSelector("text='Loading verified OHLC klines...'", { state: "detached", timeout: 4000 });
  } catch {}
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "03_shield_asset_detail.png"), fullPage: false });
  console.log("Saved 03_shield_asset_detail.png");

  // 04. Real Markets Asset Detail (AAPL)
  console.log("04. Visiting Real Markets Asset Detail (AAPL)...");
  await page.goto(`${BASE_URL}/en/real-markets/assets/nasdaq:aapl`, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await page.waitForSelector("text='Loading verified OHLC klines...'", { state: "detached", timeout: 4000 });
  } catch {}
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "04_real_markets_asset_detail.png"), fullPage: false });
  console.log("Saved 04_real_markets_asset_detail.png");

  // 05. Chart Close-up
  console.log("05. Capturing Candlestick Terminal (Chart)...");
  await page.goto(`${BASE_URL}/en/shield/assets/usdt`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const chartSection = await page.$("section:has-text('Financial Candlestick Terminal')");
  if (chartSection) {
    await chartSection.scrollIntoViewIfNeeded();
    try {
      await page.waitForSelector("text='Loading verified OHLC klines...'", { state: "detached", timeout: 4000 });
    } catch {}
    await page.waitForTimeout(800);
    const resetBtn = await page.$("button[title='Reset Zoom']");
    if (resetBtn) {
      await resetBtn.click();
      await page.waitForTimeout(400);
    }
  }
  await page.screenshot({ path: path.join(OUT_DIR, "05_chart.png"), fullPage: false });
  console.log("Saved 05_chart.png");

  // Helper to activate tab and capture section
  async function captureTab(tabId, filename) {
    const tabBtn = await page.$(`button[data-tab-id='${tabId}']`);
    if (tabBtn) {
      await tabBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await tabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
      console.log(`Saved ${filename}`);
    }
  }

  // 06. Analysis Tab
  console.log("06. Capturing Analysis Tab...");
  await captureTab("analysis", "06_analysis.png");

  // 07. Market Impact Tab
  console.log("07. Capturing Market Impact Tab...");
  await captureTab("market_impact", "07_market_impact.png");

  // 08. Whale Watch Tab
  console.log("08. Capturing Whale Watch Tab...");
  await captureTab("whale_watch", "08_whale_watch.png");

  // 09. Evidence Tab
  console.log("09. Capturing Evidence Tab...");
  await captureTab("evidence", "09_evidence.png");

  // 10. History Tab
  console.log("10. Capturing History Tab...");
  await captureTab("history", "10_history.png");

  // 11. Shield Mobile (390x844)
  console.log("11. Capturing Shield Mobile (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await mobileContext.addInitScript(initConsentScript);

  const mobilePage1 = await mobileContext.newPage();
  await mobilePage1.goto(`${BASE_URL}/en/shield/assets/usdt`, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await mobilePage1.waitForSelector("text='Loading verified OHLC klines...'", { state: "detached", timeout: 4000 });
  } catch {}
  await mobilePage1.waitForTimeout(1000);
  await mobilePage1.screenshot({ path: path.join(OUT_DIR, "11_shield_mobile.png"), fullPage: false });
  console.log("Saved 11_shield_mobile.png");

  // 12. Real Markets Mobile (390x844)
  console.log("12. Capturing Real Markets Mobile (390x844)...");
  const mobilePage2 = await mobileContext.newPage();
  await mobilePage2.goto(`${BASE_URL}/en/real-markets/assets/nasdaq:aapl`, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await mobilePage2.waitForSelector("text='Loading verified OHLC klines...'", { state: "detached", timeout: 4000 });
  } catch {}
  await mobilePage2.waitForTimeout(1000);
  await mobilePage2.screenshot({ path: path.join(OUT_DIR, "12_markets_mobile.png"), fullPage: false });
  console.log("Saved 12_markets_mobile.png");
  await mobileContext.close();

  // 13. Coming Soon if Present (/en/shield/pro)
  console.log("13. Capturing Coming Soon (/en/shield/pro)...");
  await page.goto(`${BASE_URL}/en/shield/pro`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "13_coming_soon_if_present.png"), fullPage: false });
  console.log("Saved 13_coming_soon_if_present.png");

  await browser.close();
  console.log("All Section 81 screenshots successfully captured and verified!");
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
