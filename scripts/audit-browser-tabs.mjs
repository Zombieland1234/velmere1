import { chromium } from "playwright";

async function testBrowser() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  const report = [];

  for (const locale of ["pl", "en", "de"]) {
    console.log(`\nTesting Browser in [${locale}]...`);
    await page.goto(`http://localhost:3000/${locale}/browser`, { waitUntil: "networkidle", timeout: 20000 });
    
    // 1. Verify Quick Action Cards
    const bchCard = page.locator(".velmere-lens-discovery-card").first();
    const bchCount = await bchCard.count();
    report.push({ test: `${locale}: Explore Bitcoin Cash card present`, pass: bchCount > 0 });

    if (bchCount > 0) {
      await bchCard.click();
      await page.waitForResponse(res => res.url().includes("/api/search?q=BCH") && res.status() === 200, { timeout: 10000 });
      await page.waitForTimeout(1000);
      const resultsCount = await page.locator("[data-testid='lens-result-card']").count();
      const hasBchText = (await page.content()).includes("BCH");
      report.push({ test: `${locale}: Click Explore Bitcoin Cash loads BCH`, pass: resultsCount > 0 && hasBchText });
    }

    // 2. Open an asset modal from Real Markets to verify the 4 tabs
    console.log(`Navigating to [${locale}]/real-markets to test Asset Detail Modal tabs...`);
    await page.goto(`http://localhost:3000/${locale}/real-markets`, { waitUntil: "networkidle", timeout: 20000 });
    const btcBtn = page.locator("button:has-text('BTC-USD'), button:has-text('Bitcoin'), [data-symbol='BTC-USD']").first();
    if (await btcBtn.count() > 0) {
      await btcBtn.click();
      await page.waitForTimeout(1000);
      
      // Verify Modal is opened
      const modal = page.locator(".vlm-asset-detail-drawer, [role='dialog']").first();
      const modalOpen = await modal.count() > 0;
      report.push({ test: `${locale}: Asset Detail Modal opened`, pass: modalOpen });

      if (modalOpen) {
        // Find tabs: Overview, Analysis, Market Impact, Whale Watch (Large Players)
        const overviewTab = page.locator("#vlm-asset-detail-tab-overview");
        const analysisTab = page.locator("#vlm-asset-detail-tab-analysis");
        const impactTab = page.locator("#vlm-asset-detail-tab-market-impact");
        const whaleTab = page.locator("#vlm-asset-detail-tab-whale-watch");

        report.push({ test: `${locale}: Overview tab present`, pass: (await overviewTab.count()) > 0 });
        report.push({ test: `${locale}: Analysis tab present`, pass: (await analysisTab.count()) > 0 });
        report.push({ test: `${locale}: Market Impact tab present`, pass: (await impactTab.count()) > 0 });
        report.push({ test: `${locale}: Large Players tab present`, pass: (await whaleTab.count()) > 0 });

        // Switch repeatedly between them (Stress Test)
        console.log(`Rapidly switching tabs between Overview, Analysis, Market Impact, Large Players for [${locale}]...`);
        for (let i = 0; i < 3; i++) {
          await analysisTab.click();
          await page.waitForTimeout(200);
          await impactTab.click();
          await page.waitForTimeout(200);
          await whaleTab.click();
          await page.waitForTimeout(200);
          await overviewTab.click();
          await page.waitForTimeout(200);
        }

        // Verify Overview chart canvas is intact
        const chartCanvas = page.locator("canvas").first();
        const chartIntact = (await chartCanvas.count()) > 0;
        report.push({ test: `${locale}: Chart canvas intact after rapid tab switches`, pass: chartIntact });

        // Close modal
        const closeBtn = page.locator(".vlm-asset-detail-close").first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(400);
        }
      }
    }
  }

  await browser.close();

  console.log("\n=== BROWSER & MODAL AUDIT SUMMARY ===");
  for (const r of report) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.test}`);
  }
  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors during browser test (${consoleErrors.length}):`);
    consoleErrors.slice(0, 10).forEach(e => console.log("  -", e.text.slice(0, 150)));
  } else {
    console.log("\nZero console errors during browser test!");
  }
}

testBrowser().catch(console.error);

