import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const firstRow = page.locator(".realmarkets-pass578-grid").nth(1);
  await firstRow.click();
  await page.waitForTimeout(2000);

  const tiles = await page.locator(".vlm-asset-pass4590-tile").all();
  for (const tile of tiles) {
    const label = await tile.locator(".vlm-asset-pass4590-tile-head span").textContent();
    const val = await tile.locator("strong").textContent();
    const cap = await tile.locator("small").textContent();
    console.log(`TILE [${label?.trim()}]: val="${val?.trim()}" cap="${cap?.trim()}"`);
  }

  await browser.close();
}

main().catch(console.error);
