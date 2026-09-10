import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = "C:\\Users\\marci\\Desktop\\Nowy folder\\audit_captures_goal";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("=== CAPTURING REAL VELMERE ROUTES ===");

  // 1. Markets - Shield Clean
  console.log("[1/7] Capturing /pl/shield...");
  await page.goto(`${BASE}/pl/shield`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "goal_01_shield.png"), fullPage: false });

  // 2. Markets - Shield Pro
  console.log("[2/7] Capturing /pl/shield-pro...");
  await page.goto(`${BASE}/pl/shield-pro`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "goal_02_shield_pro.png"), fullPage: false });

  // 3. Markets - Real Markets
  console.log("[3/7] Capturing /pl/real-markets...");
  await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "goal_03_real_markets.png"), fullPage: false });

  // 4. Audits Portal
  console.log("[4/7] Capturing /pl/security/audits...");
  await page.goto(`${BASE}/pl/security/audits`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "goal_04_security_audits.png"), fullPage: false });

  // 5. Shield Map
  console.log("[5/7] Capturing /pl/shield-map...");
  await page.goto(`${BASE}/pl/shield-map`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "goal_05_shield_map.png"), fullPage: false });

  // 6. Open Asset Detail Modal from Real Markets
  console.log("[6/7] Opening Asset Detail Modal on /pl/real-markets...");
  await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1500);
  const rowBtn = page.locator("button:has-text('Więcej'), button:has-text('Szczegóły'), button:has-text('Inspect'), [role='row']").first();
  if ((await rowBtn.count()) > 0) {
    await rowBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "goal_06_asset_modal.png"), fullPage: false });
  }

  // 7. Open How Risk is Calculated Modal
  console.log("[7/7] Opening How Risk is Calculated Modal...");
  const riskButton = page.locator("button:has-text('Jak obliczamy ryzyko'), button:has-text('How Risk is Calculated'), button:has-text('Kalkulacja ryzyka')").first();
  if ((await riskButton.count()) > 0) {
    await riskButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, "goal_07_how_risk_calculated.png"), fullPage: false });
  }

  await browser.close();
  console.log("=== CAPTURE COMPLETE ===");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
