import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = "C:/Users/marci/.gemini/antigravity/brain/5d9638fe-a165-4c96-a423-199dbccaa838";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to audits page...");
  await page.goto(BASE + "/pl/security/audits", { waitUntil: "networkidle", timeout: 25000 });
  const acceptBtn = page.locator("button").filter({ hasText: /akceptuj/i }).first();
  if (await acceptBtn.isVisible()) {
    await acceptBtn.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "final_proof_01_audits_tier_clean.png") });

  console.log("Opening How Risk is Calculated Modal...");
  const riskBtn = page.locator('button:has-text("Jak obliczane jest ryzyko?")').first();
  if (await riskBtn.isVisible()) {
    await riskBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT_DIR, "final_proof_03_risk_waterfall_modal.png") });
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Rozumiem")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  console.log("Navigating to canonical audit report...");
  await page.goto(BASE + "/pl/security/audits/report/0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3?address=0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3&tier=pro", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "final_proof_02_report_clean.png") });

  console.log("Navigating to shield pro...");
  await page.goto(BASE + "/pl/shield-pro", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1500);
  const metricBtn = page.locator('button[title*="Integralność"], button:has-text("Integralność")').first();
  if (await metricBtn.isVisible()) {
    await metricBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, "final_proof_04_shield_pro_modal.png") });
  }

  await browser.close();
  console.log("All done!");
}

main().catch(console.error);
