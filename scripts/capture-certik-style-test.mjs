import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT_DIR = path.resolve(process.cwd(), "reports/screenshots");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log(`Connecting or launching browser to test ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  
  const initConsentScript = () => {
    try {
      localStorage.setItem("velmere_cookie_consent_v2", JSON.stringify({
        version: "v2",
        timestamp: Date.now(),
        necessary: true,
        analytics: true,
        marketing: true,
        region: "DEFAULT"
      }));
    } catch (e) {}
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1.5,
  });
  await context.addInitScript(initConsentScript);

  const page = await context.newPage();

  console.log("1. Visiting Bitcoin (/en/shield/assets/bitcoin)...");
  await page.goto(`${BASE_URL}/en/shield/assets/bitcoin`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "certik_btc_detail.png"), fullPage: false });
  console.log("Saved certik_btc_detail.png");

  // Scroll down to capture the Forensic Security Matrix & Tabs
  await page.evaluate(() => window.scrollBy(0, 750));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "certik_btc_matrix.png"), fullPage: false });
  console.log("Saved certik_btc_matrix.png");

  // Scroll back to top and switch to Pulse Feed view
  console.log("2. Testing Pulse Feed view toggle...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const pulseBtn = page.locator('[data-testid="terminal-pulse-btn"]');
  if (await pulseBtn.isVisible()) {
    await pulseBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "certik_btc_pulse.png"), fullPage: false });
    console.log("Saved certik_btc_pulse.png");
  }

  // Visit AAPL to verify traditional adaptation
  console.log("3. Visiting Apple Inc. (/en/real-markets/assets/ast_eq_01_aapl)...");
  await page.goto(`${BASE_URL}/en/real-markets/assets/ast_eq_01_aapl`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "certik_aapl_detail.png"), fullPage: false });
  console.log("Saved certik_aapl_detail.png");

  // Mobile viewport capture
  console.log("4. Testing mobile viewport (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await mobileContext.addInitScript(initConsentScript);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE_URL}/en/shield/assets/bitcoin`, { waitUntil: "networkidle", timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(OUT_DIR, "certik_btc_mobile.png"), fullPage: false });
  console.log("Saved certik_btc_mobile.png");

  await browser.close();
  console.log("Verification run complete!");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
