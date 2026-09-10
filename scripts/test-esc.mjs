import { chromium } from "playwright";

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/en/market-integrity");
  await page.waitForTimeout(1500);

  console.log("Initial dialogs count:", await page.locator("[role='dialog']").count());
  console.log("Initial modal class count:", await page.locator(".vlm-asset-detail-modal").count());

  await page.waitForSelector("table tbody tr, [data-pass4577-shield-row]", { timeout: 15000 });
  const firstRow = page.locator("table tbody tr, [data-pass4577-shield-row]").first();
  await firstRow.click();
  await page.waitForTimeout(1000);

  console.log("After click dialogs count:", await page.locator("[role='dialog']").count());
  console.log("After click modal class count:", await page.locator(".vlm-asset-detail-modal").count());

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  console.log("After Escape dialogs count:", await page.locator("[role='dialog']").count());
  console.log("After Escape modal class count:", await page.locator(".vlm-asset-detail-modal").count());

  await browser.close();
}

test();
