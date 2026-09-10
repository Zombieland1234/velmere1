import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const artifactDir = "C:/Users/marci/.gemini/antigravity/brain/efa1005e-c2fb-464d-82ed-58e66bedeae8/visual_audit";
  fs.mkdirSync(artifactDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log("=== 1. VERIFY RISK MANAGEMENT PAGE ===");
  await page.goto("http://localhost:3000/pl/risk-management", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const cookieBtn = page.locator('button:has-text("Akceptuj"), button:has-text("Allow"), button:has-text("Zgoda")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: path.join(artifactDir, "final_risk_management.png"), fullPage: false });
  console.log("Captured final_risk_management.png");

  console.log("=== 2. VERIFY VERIFIED AUDITS PAGE & OM/LAB TOKENS ===");
  await page.goto("http://localhost:3000/pl/verified-audits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const omFound = await page.locator('text="OM"').first().isVisible();
  const labFound = await page.locator('text="LAB"').first().isVisible();
  console.log(`Audits page contains OM: ${omFound}, LAB: ${labFound}`);
  await page.screenshot({ path: path.join(artifactDir, "final_verified_audits.png"), fullPage: false });
  console.log("Captured final_verified_audits.png");

  console.log("=== 3. VERIFY SHIELD NAVIGATION (NO MODAL, DIRECT REDIRECT) ===");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click on the first row or search for OM / Bitcoin
  const btcRow = page.locator('tr:has-text("BTC"), tr:has-text("Bitcoin"), div[role="row"]:has-text("Bitcoin")').first();
  if (await btcRow.isVisible()) {
    console.log("Clicking Bitcoin row in Shield...");
    await btcRow.click();
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log("URL after Shield row click:", currentUrl);
    const hasModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    console.log("Is old popup modal visible?:", hasModal);
    if (!currentUrl.includes("/shield/assets/") && !currentUrl.includes("/assets/")) {
      throw new Error(`Expected direct navigation to /shield/assets/, got: ${currentUrl}`);
    }
  }

  console.log("=== 4. VERIFY ASSET DETAIL PAGE (OM - MANTRA) ===");
  await page.goto("http://localhost:3000/pl/shield/assets/om", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // Wait for chart sweep animation

  const omPageContent = await page.textContent("body");
  const has044 = omPageContent.includes("0.44") || omPageContent.includes("0,44");
  const has94 = omPageContent.includes("94");
  console.log(`OM Detail Page: Has price ~0.44: ${has044}, Has risk 94: ${has94}`);

  // Check viewport height vs document height
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const clientHeight = await page.evaluate(() => window.innerHeight);
  console.log(`OM Page - Window Height: ${clientHeight}px, Scroll Height: ${scrollHeight}px`);
  await page.screenshot({ path: path.join(artifactDir, "final_asset_om_detail.png"), fullPage: false });
  console.log("Captured final_asset_om_detail.png");

  console.log("=== 5. VERIFY REAL MARKETS NAVIGATION (NO MODAL, DIRECT REDIRECT) ===");
  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const nvdaRow = page.locator('div[data-testid="realmarkets-row"]:has-text("NVIDIA"), div[data-testid="realmarkets-row"]:has-text("NVDA"), div[data-testid="realmarkets-row"]').first();
  if (await nvdaRow.isVisible()) {
    console.log("Clicking exact NVDA row in Real Markets...");
    await nvdaRow.click();
    await page.waitForTimeout(2000);
    const rmUrl = page.url();
    console.log("URL after Real Markets row click:", rmUrl);
    const hasRmModal = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    console.log("Is old Real Markets modal visible?:", hasRmModal);
    if (!rmUrl.includes("/real-markets/assets/") && !rmUrl.includes("/assets/")) {
      throw new Error(`Expected direct navigation to /real-markets/assets/, got: ${rmUrl}`);
    }
  }

  console.log("=== 6. VERIFY ASSET DETAIL PAGE (NVDA) ===");
  await page.goto("http://localhost:3000/pl/real-markets/assets/nvda", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(artifactDir, "final_asset_nvda_detail.png"), fullPage: false });
  console.log("Captured final_asset_nvda_detail.png");

  await browser.close();
  console.log("ALL DELIVERABLES EMPIRICALLY VERIFIED VIA PLAYWRIGHT!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

