import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("PASS471 E2E skipped: Playwright/Chromium is not installed.");
  process.exit(2);
}

const baseURL = process.env.PASS471_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.route("**/api/market-integrity/real-markets/catalog", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      counts: { total: 3, uniqueSymbols: 1, inheritedRowsCollapsed: 0, stocks: 1, fx: 0, etf: 0, commodities: 0, realEstate: 0, crypto: 0, exchangeTokens: 0 },
      rows: [null, { id: "broken", symbol: null }, { id: "aapl", symbol: "AAPL", name: null, assetClass: "stock", riskPressure: 140 }],
    }),
  });
});

await page.route("**/api/market-integrity/real-markets?**", async (route) => {
  const url = new URL(route.request().url());
  if (url.searchParams.has("q")) {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, results: [null, { symbol: null }, { symbol: "MSFT", name: null, quoteType: null }] }) });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, generatedAt: new Date().toISOString(), quotes: [null, { symbol: null }, { symbol: "AAPL", state: "live", candles: [null, { timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.4 }] }] }) });
});

await page.goto(`${baseURL}/en/market-integrity`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
const body = await page.locator("body").innerText();
if (/Application error|Unhandled Runtime Error|Cannot read properties/i.test(body)) {
  throw new Error("PASS471 malformed Real Markets payload caused a visible runtime error");
}
await page.screenshot({ path: "pass471-realmarkets-malformed-payload.png", fullPage: true });
await browser.close();
console.log("PASS471 malformed payload browser flow passed");
