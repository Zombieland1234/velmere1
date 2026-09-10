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

  console.log("=== AUDITING SHIELD / REAL MARKETS CHARTS ===");

  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "networkidle", timeout: 20000 });

  // Check horizontal document dragging / overflow
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const hasNoHorizontalOverflow = scrollWidth <= clientWidth;
  results.push({ test: "Real Markets has no horizontal page dragging/overflow", pass: hasNoHorizontalOverflow });

  // Open asset modal for Apple
  const appleRow = page.locator("div.realmarkets-pass578-grid[aria-label*='Apple']").first();
  if ((await appleRow.count()) > 0) {
    await appleRow.click();
    await page.waitForTimeout(1500);

    const canvas = page.locator(".vlm-asset-chart-canvas, canvas").first();
    const hasCanvas = (await canvas.count()) > 0;
    results.push({ test: "Candlestick canvas rendered inside modal", pass: hasCanvas });

    if (hasCanvas) {
      // Check canvas dimensions
      const box = await canvas.boundingBox();
      const validDimensions = box && box.width > 200 && box.height > 100;
      results.push({ test: `Canvas dimensions valid (${box?.width}x${box?.height})`, pass: validDimensions });

      // Test timeframe switches inside modal: 15m, 1h, 4h, 1d, 1w, 1mo
      const timeframes = ["15m", "1h", "4h", "1d", "1w", "1mo"];
      for (const tf of timeframes) {
        const tfBtn = page.locator(`.vlm-asset-timeframe-switch button:has-text('${tf}'), .vlm-asset-detail-timeframe:has-text('${tf}')`).first();
        if ((await tfBtn.count()) > 0) {
          await tfBtn.click();
          await page.waitForTimeout(500);
          const stillHasCanvas = (await page.locator("canvas").count()) > 0;
          results.push({ test: `Timeframe switch to [${tf}] successful`, pass: stillHasCanvas });
        }
      }

      // Close modal
      const closeBtn = page.locator(".vlm-asset-detail-close").first();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
        await page.waitForTimeout(400);
      }
    }
  }

  // Also check Shield (/en/shield)
  console.log("\nAuditing Shield page (/en/shield)...");
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "networkidle", timeout: 20000 });
  const shieldScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const shieldClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  results.push({ test: "Shield page has no horizontal overflow", pass: shieldScrollWidth <= shieldClientWidth });

  await browser.close();

  console.log("\n=== CHART AUDIT RESULTS ===");
  let passes = 0;
  for (const r of results) {
    if (r.pass) passes++;
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.test}`);
  }
  console.log(`\nRESULT: ${passes}/${results.length} PASSED`);
}

main().catch(console.error);
