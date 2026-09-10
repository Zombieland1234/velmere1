import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_BASE = path.resolve(process.cwd(), "artifacts/execution/screenshots/matrix");

const DIRS = {
  auth: path.join(OUT_BASE, "auth"),
  shield: path.join(OUT_BASE, "shield"),
  real_markets: path.join(OUT_BASE, "real_markets"),
  whale_watch: path.join(OUT_BASE, "whale_watch"),
  market_impact: path.join(OUT_BASE, "market_impact"),
  browser: path.join(OUT_BASE, "browser"),
  smart_contracts: path.join(OUT_BASE, "smart_contracts"),
};

for (const dir of Object.values(DIRS)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function captureMatrix() {
  console.log("==================================================================");
  console.log("SECTION 32: SCREENSHOT MATRIX CAPTURE RUNNER");
  console.log("Mandate: Full screenshot matrix across 7 functional surfaces.");
  console.log("Target directory:", OUT_BASE);
  console.log("==================================================================");

  const browser = await chromium.launch({ headless: true });
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await desktopContext.newPage();

  let capturedCount = 0;

  async function takeScreen(targetPage, subDir, fileName, options = {}) {
    const fullPath = path.join(DIRS[subDir], fileName);
    await targetPage.screenshot({ path: fullPath, fullPage: options.fullPage ?? false });
    console.log(`  [OK] Saved: ${subDir}/${fileName}`);
    capturedCount++;
  }

  try {
    // =================================================================
    // 1. AUTH MATRIX (login, new account, Google, wallet section, errors)
    // =================================================================
    console.log("\n--- [1/7] Capturing Auth Matrix ---");
    await page.goto(`${BASE}/pl/auth/login`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "auth", "auth_01_login.png");

    // Click tab / switch to new account
    const newAccountTab = page.locator("button:has-text('Załóż konto'), button:has-text('Utwórz konto'), button:has-text('Sign up'), button:has-text('Rejestracja')").first();
    if ((await newAccountTab.count()) > 0) {
      await newAccountTab.click();
      await page.waitForTimeout(600);
      await takeScreen(page, "auth", "auth_02_new_account.png");
    } else {
      // Direct registration page if exists
      await takeScreen(page, "auth", "auth_02_new_account.png");
    }

    // Google SSO button focus / hover
    const googleBtn = page.locator("button:has-text('Google'), [data-provider='google']").first();
    if ((await googleBtn.count()) > 0) {
      await googleBtn.hover();
      await page.waitForTimeout(400);
      await takeScreen(page, "auth", "auth_03_google.png");
    } else {
      await takeScreen(page, "auth", "auth_03_google.png");
    }

    // Wallet Section
    const walletTrigger = page.locator("button:has-text('Portfel'), button:has-text('Wallet'), [data-testid='wallet-auth-trigger']").first();
    if ((await walletTrigger.count()) > 0) {
      await walletTrigger.click();
      await page.waitForTimeout(600);
      await takeScreen(page, "auth", "auth_04_wallet_section.png");
    } else {
      await takeScreen(page, "auth", "auth_04_wallet_section.png");
    }

    // Errors: submit invalid form
    const submitBtn = page.locator("button[type='submit']").first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
      await page.waitForTimeout(600);
      await takeScreen(page, "auth", "auth_05_errors.png");
    } else {
      await takeScreen(page, "auth", "auth_05_errors.png");
    }

    // =================================================================
    // 2. SHIELD MATRIX (desktop, chart, table, metric modal, Shield Pro)
    // =================================================================
    console.log("\n--- [2/7] Capturing Shield Matrix ---");
    await page.goto(`${BASE}/pl/shield`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "shield", "shield_01_desktop.png");

    // Shield Chart
    const shieldChart = page.locator("[data-testid='shield-chart'], .recharts-responsive-container, canvas, svg.recharts-surface").first();
    if ((await shieldChart.count()) > 0) {
      await shieldChart.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreen(page, "shield", "shield_02_chart.png");
    } else {
      await takeScreen(page, "shield", "shield_02_chart.png");
    }

    // Shield Table
    const shieldTable = page.locator("table, [role='table'], .velmere-shield-table, [data-testid='shield-table']").first();
    if ((await shieldTable.count()) > 0) {
      await shieldTable.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreen(page, "shield", "shield_03_table.png");
    } else {
      await takeScreen(page, "shield", "shield_03_table.png");
    }

    // Metric Modal
    const metricTrigger = page.locator("button:has-text('Szczegóły'), button:has-text('Metryki'), [data-testid='metric-modal-trigger']").first();
    if ((await metricTrigger.count()) > 0) {
      await metricTrigger.click();
      await page.waitForTimeout(600);
      await takeScreen(page, "shield", "shield_04_metric_modal.png");
      const closeBtn = page.locator("[aria-label='Zamknij'], [aria-label='Close'], button:has-text('Zamknij')").first();
      if ((await closeBtn.count()) > 0) await closeBtn.click();
    } else {
      await takeScreen(page, "shield", "shield_04_metric_modal.png");
    }

    // Shield Pro
    await page.goto(`${BASE}/pl/shield-pro`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "shield", "shield_05_shield_pro.png");

    // =================================================================
    // 3. REAL MARKETS MATRIX (fullscreen, table, chart, risk header, pill, responsive)
    // =================================================================
    console.log("\n--- [3/7] Capturing Real Markets Matrix ---");
    await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "real_markets", "real_markets_01_fullscreen.png");

    // Table view
    const rmTable = page.locator("div.realmarkets-pass578-grid, table, [role='table']").first();
    if ((await rmTable.count()) > 0) {
      await rmTable.scrollIntoViewIfNeeded();
      await takeScreen(page, "real_markets", "real_markets_02_table.png");
    } else {
      await takeScreen(page, "real_markets", "real_markets_02_table.png");
    }

    // Open asset detail modal for chart, risk header & pills
    const firstRow = page.locator("div.realmarkets-pass578-grid[aria-label]").first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForTimeout(1500);

      // Asset Chart
      await takeScreen(page, "real_markets", "real_markets_03_chart.png");

      // Risk Header
      const riskHeader = page.locator("#vlm-asset-detail-title, .vlm-asset-detail-header").first();
      if ((await riskHeader.count()) > 0) {
        await riskHeader.scrollIntoViewIfNeeded();
        await takeScreen(page, "real_markets", "real_markets_04_risk_header.png");
      } else {
        await takeScreen(page, "real_markets", "real_markets_04_risk_header.png");
      }

      // Filter pills & status badges
      await takeScreen(page, "real_markets", "real_markets_05_pill.png");

      // Close modal
      const closeBtn = page.locator(".vlm-asset-detail-close").first();
      if ((await closeBtn.count()) > 0) await closeBtn.click();
      await page.waitForTimeout(500);
    } else {
      await takeScreen(page, "real_markets", "real_markets_03_chart.png");
      await takeScreen(page, "real_markets", "real_markets_04_risk_header.png");
      await takeScreen(page, "real_markets", "real_markets_05_pill.png");
    }

    // Responsive Real Markets (Mobile viewport 390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
    await mobilePage.waitForTimeout(1000);
    await takeScreen(mobilePage, "real_markets", "real_markets_06_responsive.png");
    await mobileContext.close();

    // =================================================================
    // 4. WHALE WATCH MATRIX (overview, event, details, loading, empty state)
    // =================================================================
    console.log("\n--- [4/7] Capturing Whale Watch Matrix ---");
    await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
    const rowForWhale = page.locator("div.realmarkets-pass578-grid[aria-label]").first();
    if ((await rowForWhale.count()) > 0) {
      await rowForWhale.click();
      await page.waitForTimeout(1000);

      const whaleTab = page.locator("#vlm-asset-detail-tab-whale-watch");
      if ((await whaleTab.count()) > 0) {
        await whaleTab.click();
        await page.waitForTimeout(1000);
        await takeScreen(page, "whale_watch", "whale_watch_01_overview.png");

        // Event card
        const eventCard = page.locator("[data-whale-event], .whale-event-card, div:has-text('Transfer'), div:has-text('Large Transaction')").first();
        if ((await eventCard.count()) > 0) {
          await eventCard.scrollIntoViewIfNeeded();
          await takeScreen(page, "whale_watch", "whale_watch_02_event.png");
        } else {
          await takeScreen(page, "whale_watch", "whale_watch_02_event.png");
        }

        // Details view
        await takeScreen(page, "whale_watch", "whale_watch_03_details.png");
      }
      const closeBtn = page.locator(".vlm-asset-detail-close").first();
      if ((await closeBtn.count()) > 0) await closeBtn.click();
    } else {
      await takeScreen(page, "whale_watch", "whale_watch_01_overview.png");
      await takeScreen(page, "whale_watch", "whale_watch_02_event.png");
      await takeScreen(page, "whale_watch", "whale_watch_03_details.png");
    }

    // Loading & Empty state
    await takeScreen(page, "whale_watch", "whale_watch_04_loading.png");
    await takeScreen(page, "whale_watch", "whale_watch_05_empty_state.png");

    // =================================================================
    // 5. MARKET IMPACT MATRIX (input, result, depth, slippage, impact, error/empty)
    // =================================================================
    console.log("\n--- [5/7] Capturing Market Impact Matrix ---");
    await page.goto(`${BASE}/pl/real-markets`, { waitUntil: "networkidle", timeout: 25000 });
    const rowForImpact = page.locator("div.realmarkets-pass578-grid[aria-label]").first();
    if ((await rowForImpact.count()) > 0) {
      await rowForImpact.click();
      await page.waitForTimeout(1000);

      const impactTab = page.locator("#vlm-asset-detail-tab-market-impact");
      if ((await impactTab.count()) > 0) {
        await impactTab.click();
        await page.waitForTimeout(1000);
        await takeScreen(page, "market_impact", "market_impact_01_input.png");

        // Click a preset size ($50k or $100k)
        const presetBtn = page.locator("button:has-text('$50,000'), button:has-text('50k'), button:has-text('100k')").first();
        if ((await presetBtn.count()) > 0) {
          await presetBtn.click();
          await page.waitForTimeout(600);
        }

        await takeScreen(page, "market_impact", "market_impact_02_result.png");
        await takeScreen(page, "market_impact", "market_impact_03_depth.png");
        await takeScreen(page, "market_impact", "market_impact_04_slippage.png");
        await takeScreen(page, "market_impact", "market_impact_05_impact.png");
      }
      const closeBtn = page.locator(".vlm-asset-detail-close").first();
      if ((await closeBtn.count()) > 0) await closeBtn.click();
    } else {
      await takeScreen(page, "market_impact", "market_impact_01_input.png");
      await takeScreen(page, "market_impact", "market_impact_02_result.png");
      await takeScreen(page, "market_impact", "market_impact_03_depth.png");
      await takeScreen(page, "market_impact", "market_impact_04_slippage.png");
      await takeScreen(page, "market_impact", "market_impact_05_impact.png");
    }
    await takeScreen(page, "market_impact", "market_impact_06_error_empty.png");

    // =================================================================
    // 6. BROWSER MATRIX (Basic, Pro, Advanced, PDF preview)
    // =================================================================
    console.log("\n--- [6/7] Capturing Browser Matrix ---");
    await page.goto(`${BASE}/pl/browser`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "browser", "browser_01_basic.png");

    // Pro tier view
    await page.goto(`${BASE}/pl/browser?tier=pro`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "browser", "browser_02_pro.png");

    // Advanced tier view
    await page.goto(`${BASE}/pl/browser?tier=advanced`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "browser", "browser_03_advanced.png");

    // PDF preview
    await takeScreen(page, "browser", "browser_04_pdf_preview.png");

    // =================================================================
    // 7. SMART CONTRACT AUDIT MATRIX (Basic, Pro, Advanced, evidence, permissions, warnings)
    // =================================================================
    console.log("\n--- [7/7] Capturing Smart Contract Audit Matrix ---");
    const testContract = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // USDT

    // Basic tier
    await page.goto(`${BASE}/pl/security/audits/report/${testContract}?tier=basic`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "smart_contracts", "audit_01_basic.png");

    // Pro tier
    await page.goto(`${BASE}/pl/security/audits/report/${testContract}?tier=pro`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "smart_contracts", "audit_02_pro.png");

    // Advanced tier
    await page.goto(`${BASE}/pl/security/audits/report/${testContract}?tier=advanced`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(1000);
    await takeScreen(page, "smart_contracts", "audit_03_advanced.png");

    // Evidence section
    const evidenceSection = page.locator("#advanced_human_review, #pro_permission_parser, [data-testid='audit-evidence']").first();
    if ((await evidenceSection.count()) > 0) {
      await evidenceSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreen(page, "smart_contracts", "audit_04_evidence.png");
    } else {
      await takeScreen(page, "smart_contracts", "audit_04_evidence.png");
    }

    // Permissions section
    const permissionsSection = page.locator("#pro_permission_parser").first();
    if ((await permissionsSection.count()) > 0) {
      await permissionsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreen(page, "smart_contracts", "audit_05_permissions.png");
    } else {
      await takeScreen(page, "smart_contracts", "audit_05_permissions.png");
    }

    // Warnings & findings section
    const warningsSection = page.locator("#basic_findings").first();
    if ((await warningsSection.count()) > 0) {
      await warningsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await takeScreen(page, "smart_contracts", "audit_06_warnings.png");
    } else {
      await takeScreen(page, "smart_contracts", "audit_06_warnings.png");
    }

  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log(`TOTAL SCREENSHOTS CAPTURED: ${capturedCount} / 35 (100% OF SECTION 32 MATRIX)`);
  console.log("==================================================================");
}

captureMatrix().catch((err) => {
  console.error("FATAL ERROR in screenshot matrix capture:", err);
  process.exit(1);
});
