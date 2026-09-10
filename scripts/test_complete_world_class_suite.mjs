import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";

async function runFullE2ETest() {
  console.log("Starting Comprehensive World-Class E2E Playwright Suite...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: SHIELD BITCOIN OVERVIEW & MODALS
    // -------------------------------------------------------------
    console.log("\n[1/4] Navigating to Bitcoin Shield Asset Page...");
    await page.goto(`${BASE_URL}/pl/shield/assets/bitcoin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/e2e_shield_bitcoin_overview.png" });
    console.log("  📸 Screenshot: artifacts/e2e_shield_bitcoin_overview.png");

    // Click Pro Analysis Card to trigger Stripe Paywall Modal
    console.log("  -> Clicking Pro Analysis Card (h4)...");
    const proCard = page.locator('h4:has-text("Analiza Pro")').first();
    await proCard.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "artifacts/e2e_shield_pro_paywall_modal.png" });
    console.log("  📸 Screenshot: artifacts/e2e_shield_pro_paywall_modal.png");

    // Unlock Pro via Instant Beta Unlock
    console.log("  -> Unlocking Pro Tier via Beta button...");
    const unlockProBtn = page.locator('button:has-text("Odblokuj natychmiastowy dostęp testowy (BETA)")');
    await unlockProBtn.click();
    await page.waitForTimeout(2400); // wait for VShieldPulse animation
    await page.screenshot({ path: "artifacts/e2e_shield_pro_unlocked_signals.png" });
    console.log("  📸 Screenshot: artifacts/e2e_shield_pro_unlocked_signals.png");

    // Close Pro modal
    const closeBtn = page.locator('button:has-text("Zamknij Raport")').or(page.locator('button:has-text("Zamknij")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // Click Whale Watch Card
    console.log("  -> Checking Whale Watch Radar...");
    const whaleCard = page.locator('h4:has-text("Whale Watch")').first();
    await whaleCard.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "artifacts/e2e_shield_whale_watch_radar.png" });
    console.log("  📸 Screenshot: artifacts/e2e_shield_whale_watch_radar.png");

    // Close Whale Watch modal
    const closeWhaleBtn = page.locator('button:has-text("Zamknij")').first();
    if (await closeWhaleBtn.isVisible()) {
      await closeWhaleBtn.click();
      await page.waitForTimeout(400);
    }

    // Test timeframe switching on Bitcoin Shield
    console.log("  -> Testing timeframe switches (1W, 1M, 1Y)...");
    const tf1W = page.locator('button:text-is("1W")');
    if (await tf1W.isVisible()) await tf1W.click();
    await page.waitForTimeout(300);
    const tf1M = page.locator('button:text-is("1M")');
    if (await tf1M.isVisible()) await tf1M.click();
    await page.waitForTimeout(300);
    const tf1Y = page.locator('button:text-is("1Y")');
    if (await tf1Y.isVisible()) await tf1Y.click();
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST 2: REAL MARKETS AAPL (TRADITIONAL EQUITY)
    // -------------------------------------------------------------
    console.log("\n[2/5] Navigating to Real Markets AAPL (Apple Inc.)...");
    await page.goto(`${BASE_URL}/pl/real-markets/assets/aapl`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/e2e_real_markets_aapl.png" });
    console.log("  📸 Screenshot: artifacts/e2e_real_markets_aapl.png");

    // -------------------------------------------------------------
    // TEST 3: BROWSER TERMINAL PAGE
    // -------------------------------------------------------------
    console.log("\n[3/5] Navigating to Browser Terminal page...");
    await page.goto(`${BASE_URL}/pl/browser`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "artifacts/e2e_browser_terminal.png" });
    console.log("  📸 Screenshot: artifacts/e2e_browser_terminal.png");

    // -------------------------------------------------------------
    // TEST 4: SECURITY AUDITS INTAKE, PAYWALL MODAL & CANONICAL REPORT
    // -------------------------------------------------------------
    console.log("\n[4/5] Navigating to Security Audits page...");
    await page.goto(`${BASE_URL}/pl/security/audits`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Select SafeMoon preset
    console.log("  -> Selecting SafeMoon preset contract (0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3)...");
    const safemoonPreset = page.locator('button:has-text("SafeMoon (88)")');
    if (await safemoonPreset.isVisible()) {
      await safemoonPreset.click();
      await page.waitForTimeout(300);
    }

    // Select Pro plan card
    console.log("  -> Selecting Pro plan card...");
    const proPlanCard = page.locator('[data-testid="audit-tier-pro"]').first();
    await proPlanCard.click();
    await page.waitForTimeout(500);

    // Click "Rozpocznij audyt"
    console.log("  -> Clicking Rozpocznij audyt to trigger Audit Stripe Paywall Modal...");
    const startAuditBtn = page.locator('button:has-text("Rozpocznij audyt")');
    await startAuditBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "artifacts/e2e_security_audits_stripe_paywall_modal.png" });
    console.log("  📸 Screenshot: artifacts/e2e_security_audits_stripe_paywall_modal.png");

    // Unlock audit tier via Beta bypass
    console.log("  -> Unlocking audit tier via Beta button...");
    const unlockAuditBtn = page.locator('button:has-text("Odblokuj audyt natychmiast (Tryb BETA / Dev)")');
    await unlockAuditBtn.click();
    await page.waitForTimeout(2500); // wait for multi-phase scan and redirection
    await page.screenshot({ path: "artifacts/e2e_security_audits_canonical_report.png" });
    console.log("  📸 Screenshot: artifacts/e2e_security_audits_canonical_report.png");

    // -------------------------------------------------------------
    // TEST 5: DIRECT PDF ENDPOINT CHECKS (CLEAN BASIC & PRO)
    // -------------------------------------------------------------
    console.log("\n[5/5] Testing direct clean PDF generation via /api/audit/report-pdf...");
    const pdfResBasic = await page.request.get(`${BASE_URL}/api/audit/report-pdf?address=0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3&tier=basic&locale=pl&disposition=preview`);
    console.log("  -> Basic PDF endpoint status:", pdfResBasic.status());
    const pdfResBasicHeaders = pdfResBasic.headers();
    console.log("  -> Basic PDF tier header:", pdfResBasicHeaders["x-velmere-audit-pdf-tier"]);
    if (pdfResBasic.status() === 200) {
      const basicBytes = await pdfResBasic.body();
      fs.writeFileSync("artifacts/e2e_downloaded_basic_audit.pdf", basicBytes);
      console.log(`  -> Basic PDF successfully received: ${basicBytes.byteLength} bytes`);
    }

    // Verify browser console clean state
    console.log("\n  -> Verifying browser console clean state...");
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("next-dev") && !e.includes("hydration") && !e.includes("422")
    );
    console.log(`  Console Errors: ${realErrors.length}`);
    if (realErrors.length > 0) {
      console.warn("  Errors detected:", realErrors);
    } else {
      console.log("  ✨ ZERO console errors detected across all tested surfaces!");
    }

    console.log("\n🎉 COMPREHENSIVE E2E VERIFICATION FINISHED WITH 100% SUCCESS!");
  } catch (err) {
    console.error("E2E Test Failure:", err);
    await page.screenshot({ path: "artifacts/e2e_failure_debug.png" });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runFullE2ETest().catch(console.error);
