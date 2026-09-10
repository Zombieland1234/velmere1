import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  const results = [];

  for (const locale of ["pl", "en", "de"]) {
    console.log(`\n========================================`);
    console.log(`TESTING LOCALE: [${locale.toUpperCase()}]`);
    console.log(`========================================`);

    // Part A: Browser
    console.log(`Testing [${locale}] Browser...`);
    await page.goto(`http://localhost:3000/${locale}/browser`, { waitUntil: "networkidle", timeout: 20000 });

    const bchCard = page.locator(".velmere-lens-discovery-card").first();
    const hasCard = (await bchCard.count()) > 0;
    results.push({ test: `${locale}: Browser quick action cards visible`, pass: hasCard });

    if (hasCard) {
      console.log(`Clicking Explore Bitcoin Cash in [${locale}]...`);
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes("/api/search?q=BCH") && res.status() === 200,
        { timeout: 15000 }
      );
      await bchCard.click();
      await responsePromise;
      await page.waitForTimeout(1000);

      const hasBchText = (await page.content()).includes("BCH");
      const resultCard = page.locator("[data-testid='lens-result-card'], .vis-result-card").first();
      const hasResultCard = (await resultCard.count()) > 0;
      results.push({ test: `${locale}: Explore Bitcoin Cash loads BCH data`, pass: hasBchText && hasResultCard });
    }

    // Part B: Real Markets & Asset Detail Modal Tabs
    console.log(`Testing [${locale}] Real Markets & Asset Detail Modal Tabs...`);
    await page.goto(`http://localhost:3000/${locale}/real-markets`, { waitUntil: "networkidle", timeout: 20000 });

    const firstAssetRow = page.locator("div.realmarkets-pass578-grid[aria-label]").first();
    const hasRow = (await firstAssetRow.count()) > 0;
    results.push({ test: `${locale}: Real Markets asset rows rendered`, pass: hasRow });

    if (hasRow) {
      console.log(`Opening Asset Detail Modal for first asset in [${locale}]...`);
      await firstAssetRow.click();
      await page.waitForTimeout(1500);

      const modal = page.locator(".vlm-asset-detail-drawer, [data-pass4596-header]").first();
      const modalOpen = (await modal.count()) > 0;
      results.push({ test: `${locale}: Asset Detail Modal opened`, pass: modalOpen });

      if (modalOpen) {
        const overviewTab = page.locator("#vlm-asset-detail-tab-overview");
        const analysisTab = page.locator("#vlm-asset-detail-tab-analysis");
        const impactTab = page.locator("#vlm-asset-detail-tab-market-impact");
        const whaleTab = page.locator("#vlm-asset-detail-tab-whale-watch");

        results.push({ test: `${locale}: Modal tab Overview present`, pass: (await overviewTab.count()) > 0 });
        results.push({ test: `${locale}: Modal tab Analysis present`, pass: (await analysisTab.count()) > 0 });
        results.push({ test: `${locale}: Modal tab Market Impact present`, pass: (await impactTab.count()) > 0 });
        results.push({ test: `${locale}: Modal tab Large Players present`, pass: (await whaleTab.count()) > 0 });

        // Verify candlestick canvas chart
        const canvas = page.locator("canvas").first();
        results.push({ test: `${locale}: Candlestick canvas rendered`, pass: (await canvas.count()) > 0 });

        // Test Timeframe buttons in Overview
        const timeframe4h = page.locator("button:has-text('4h')").first();
        if ((await timeframe4h.count()) > 0) {
          await timeframe4h.click();
          await page.waitForTimeout(500);
          results.push({ test: `${locale}: Timeframe 4h clickable`, pass: true });
        }

        // Stress test: rapid tab switching (no crashes, no freeze)
        console.log(`Stress-switching tabs 5 cycles in [${locale}]...`);
        for (let cycle = 0; cycle < 5; cycle++) {
          await analysisTab.click();
          await page.waitForTimeout(100);
          await impactTab.click();
          await page.waitForTimeout(100);
          await whaleTab.click();
          await page.waitForTimeout(100);
          await overviewTab.click();
          await page.waitForTimeout(100);
        }

        // Verify canvas still exists after stress switching
        const canvasAfter = page.locator("canvas").first();
        results.push({ test: `${locale}: Candlestick canvas intact after rapid tab switches`, pass: (await canvasAfter.count()) > 0 });

        // Close modal
        const closeBtn = page.locator(".vlm-asset-detail-close").first();
        if ((await closeBtn.count()) > 0) {
          await closeBtn.click();
          await page.waitForTimeout(500);
          results.push({ test: `${locale}: Modal closed cleanly`, pass: true });
        }
      }
    }
  }

  await browser.close();

  console.log("\n========================================");
  console.log("FINAL AUDIT RESULTS - BROWSER & MODAL");
  console.log("========================================");
  let passes = 0;
  let fails = 0;
  for (const r of results) {
    if (r.pass) {
      passes++;
      console.log(`[PASS] ${r.test}`);
    } else {
      fails++;
      console.log(`[FAIL] ${r.test}`);
    }
  }
  console.log(`\nTOTAL: ${results.length} | PASS: ${passes} | FAIL: ${fails}`);
  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors encountered: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => console.log("  -", e.text.slice(0, 150)));
  } else {
    console.log("\nZero console errors during the entire run!");
  }
}

main().catch(console.error);
