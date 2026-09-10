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

  // Click on Bitcoin / first row
  const firstRow = page.locator(".realmarkets-pass578-grid").nth(1);
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForTimeout(2000);

    // Click Analiza tab
    console.log("Clicking Analiza tab...");
    const analizaTab = page.locator('button[role="tab"]:has-text("ANALIZA"), button[role="tab"]:has-text("Analiza")').first();
    if (await analizaTab.count() > 0) {
      await analizaTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, "modal_tab_analiza.png"), fullPage: false });
      console.log("Saved modal_tab_analiza.png");
    }

    // Click Wpływ na rynek tab
    console.log("Clicking Wpływ na rynek tab...");
    const impactTab = page.locator('button[role="tab"]:has-text("WPŁYW NA RYNEK"), button[role="tab"]:has-text("Wpływ")').first();
    if (await impactTab.count() > 0) {
      await impactTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, "modal_tab_market_impact.png"), fullPage: false });
      console.log("Saved modal_tab_market_impact.png");
    }

    // Click Duzi gracze tab
    console.log("Clicking Duzi gracze tab...");
    const whaleTab = page.locator('button[role="tab"]:has-text("DUZI GRACZE"), button[role="tab"]:has-text("Gracze")').first();
    if (await whaleTab.count() > 0) {
      await whaleTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT_DIR, "modal_tab_whale_watch.png"), fullPage: false });
      console.log("Saved modal_tab_whale_watch.png");
    }
  }

  await browser.close();
  console.log("DONE TABS TEST!");
}

main().catch(console.error);
