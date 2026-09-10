import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  
  // Open modal by clicking first row
  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(1200);
  
  // Switch to "Analiza" tab
  const analysisTabBtn = page.locator("#vlm-asset-detail-tab-analysis");
  console.log("Analysis tab button visible:", await analysisTabBtn.isVisible());
  if (await analysisTabBtn.isVisible()) {
    await analysisTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit_artifacts/analysis_tab_idle.png" });

    // Check Basic tier card
    const basicCard = page.locator(".vlm-analysis-tier-card[data-tier='basic']");
    console.log("Basic tier card visible:", await basicCard.isVisible());

    if (await basicCard.isVisible()) {
      console.log("Clicking Basic tier card...");
      await basicCard.click();
      console.log("Waiting for analysis completion...");
      
      await page.waitForSelector("[data-analysis-status='success'], .vlm-analysis-results-header", { timeout: 15000 })
        .catch((e) => console.log("Timeout:", e.message));
      
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "audit_artifacts/basic_analysis_success.png" });
      
      const count = await page.locator(".vlm-analysis-signal-tile").count();
      console.log("Basic signals rendered:", count);

      const verdictText = await page.locator(".vlm-analysis-results-header, .vlm-analysis-tab-shell strong").allInnerTexts();
      console.log("Verdict texts:", verdictText.slice(0, 10));

      // Test clicking a signal tile
      if (count > 0) {
        console.log("Clicking first signal tile...");
        await page.locator(".vlm-analysis-signal-tile").first().click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: "audit_artifacts/signal_detail_drawer.png" });
        const drawerVisible = await page.locator(".vlm-analysis-details-drawer").isVisible();
        console.log("Signal details drawer visible:", drawerVisible);
      }
    }
  }

  // Also check Market Impact tab
  const impactTabBtn = page.locator("#vlm-asset-detail-tab-market-impact");
  if (await impactTabBtn.isVisible()) {
    console.log("Clicking Market Impact tab...");
    await impactTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit_artifacts/market_impact_tab.png" });
  }

  // Also check Whale Watch tab
  const whaleTabBtn = page.locator("#vlm-asset-detail-tab-whale-watch");
  if (await whaleTabBtn.isVisible()) {
    console.log("Clicking Whale Watch tab...");
    await whaleTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit_artifacts/whale_watch_tab.png" });
  }

  await browser.close();
  console.log("Deep modal tabs audit complete.");
}

main().catch(console.error);
