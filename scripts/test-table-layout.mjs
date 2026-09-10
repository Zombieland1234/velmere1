import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "c:\\Users\\marci\\Desktop\\Nowy folder\\naprawa";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to Real Markets...");
  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2000);

  // Capture table header + first 5 rows of Real Markets
  await page.screenshot({ path: path.join(OUT_DIR, "real_markets_table_view.png"), fullPage: false });
  console.log("Saved real_markets_table_view.png");

  // Click on first row to open AssetDetailModal
  console.log("Opening AssetDetailModal for first row...");
  const firstRow = page.locator(".realmarkets-pass578-grid").nth(1);
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT_DIR, "chart_modal_opened.png"), fullPage: false });
    console.log("Saved chart_modal_opened.png");

    // Try zooming on chart canvas with wheel
    const canvas = page.locator("canvas").first();
    if (await canvas.count() > 0) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        for (let i = 0; i < 6; i++) {
          await page.mouse.wheel(0, -200); // zoom in
          await page.waitForTimeout(100);
        }
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT_DIR, "chart_modal_zoomed.png"), fullPage: false });
        console.log("Saved chart_modal_zoomed.png");
      }
    }
  }

  // Check Shield table
  console.log("Navigating to Shield...");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, "shield_table_view.png"), fullPage: false });
  console.log("Saved shield_table_view.png");

  await browser.close();
  console.log("DONE!");
}

main().catch(console.error);
