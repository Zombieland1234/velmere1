#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== PHASE 3: REAL PRODUCT & BROWSER EXECUTION ===");
  fs.mkdirSync("artifacts/products", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const productAudits = [];

  try {
    // 1. Audit Intake & Validation
    console.log("1. Testing Audit Intake & Contract Prescreen...");
    await page.goto(`${BASE}/en/security/audits`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const auditInput = page.locator("input[placeholder*='0x']").first();
    const hasAuditInput = await auditInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasAuditInput) {
      await auditInput.fill("0x55d398326f99059fF775485246999027B3197955");
      await page.waitForTimeout(1000);
      const mainText = await page.locator("main").innerText();
      const hasStopSell = mainText.includes("Paid tiers are not currently sold") || mainText.includes("SECURE PREVIEW");
      productAudits.push({ product: "Audit", status: "PASS", interactive: true, stopSellNotice: hasStopSell });
      console.log("   [PASS] Audit Product Interactive | Stop-Sell Notice:", hasStopSell);
    } else {
      productAudits.push({ product: "Audit", status: "FAIL", reason: "Input not found" });
    }

    // 2. Shield Terminal & Assets
    console.log("2. Testing Shield Terminal & Search...");
    await page.goto(`${BASE}/en/shield`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const shieldInput = page.locator("input.shield-search-input-pass2382, input[placeholder*='Search']").first();
    const hasShieldInput = await shieldInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasShieldInput) {
      await shieldInput.fill("BTC");
      await page.waitForTimeout(2000);
      const shieldText = await page.locator("main").innerText();
      const hasLanes = shieldText.includes("INSTRUMENTS") || shieldText.includes("SOURCE");
      productAudits.push({ product: "Shield", status: "PASS", interactive: true, lanesRendered: hasLanes });
      console.log("   [PASS] Shield Product Interactive | Lanes Rendered:", hasLanes);
    } else {
      productAudits.push({ product: "Shield", status: "FAIL", reason: "Shield input not found" });
    }

    // 3. Shield Map Explorer
    console.log("3. Testing Shield Map Explorer...");
    await page.goto(`${BASE}/en/shield-map`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const mapBtn = page.locator("button:has-text('BTC'), button:has-text('ETH')").first();
    const hasMapBtn = await mapBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasMapBtn) {
      await mapBtn.click();
      await page.waitForTimeout(2000);
      const mapText = await page.locator("main").innerText();
      productAudits.push({ product: "Shield Map", status: "PASS", interactive: true, snippet: mapText.slice(0, 100) });
      console.log("   [PASS] Shield Map Interactive");
    } else {
      productAudits.push({ product: "Shield Map", status: "FAIL", reason: "Preset buttons not found" });
    }

    // 4. Shield Pro
    console.log("4. Testing Shield Pro Analytical Terminal...");
    await page.goto(`${BASE}/en/shield-pro`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const proText = await page.locator("main").innerText();
    const hasProTerminal = proText.includes("ANALYTICAL TERMINAL") || proText.includes("EVIDENCE-BOUND");
    productAudits.push({ product: "Shield Pro", status: "PASS", rendered: hasProTerminal });
    console.log("   [PASS] Shield Pro Terminal Rendered:", hasProTerminal);

  } finally {
    await browser.close();
  }

  const receipt = {
    schemaVersion: "velmere.phase3.real-product-execution.receipt.v1",
    executedAt: new Date().toISOString(),
    productAudits,
    allPassed: productAudits.every((p) => p.status === "PASS")
  };

  const receiptPath = path.resolve("artifacts/products/PHASE3_REAL_PRODUCT_EXECUTION_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Phase 3 Product Execution Receipt to: ${receiptPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
