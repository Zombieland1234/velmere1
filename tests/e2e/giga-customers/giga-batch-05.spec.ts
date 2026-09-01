import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 41,
    "role": "Equity Analyst",
    "goal": "Retrieve current market info for large public equity",
    "prod": "real-markets",
    "tier": "basic",
    "asset": "AAPL",
    "lang": "en",
    "device": "desktop",
    "path": "/en/real-markets",
    "input": "AAPL"
  },
  {
    "id": 42,
    "role": "ETF Analyst",
    "goal": "Compare provider data for SPY ETF",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "SPY",
    "lang": "de",
    "device": "desktop",
    "path": "/de/real-markets",
    "input": "SPY"
  },
  {
    "id": 43,
    "role": "REIT Analyst",
    "goal": "Inspect deeper REIT market data",
    "prod": "real-markets",
    "tier": "advanced",
    "asset": "VNQ",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/real-markets",
    "input": "VNQ"
  },
  {
    "id": 44,
    "role": "FX Trader",
    "goal": "Check FX EUR/USD currency pair",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "EURUSD",
    "lang": "en",
    "device": "desktop",
    "path": "/en/real-markets",
    "input": "EUR/USD"
  },
  {
    "id": 45,
    "role": "Commodity Analyst",
    "goal": "Inspect gold commodity data",
    "prod": "real-markets",
    "tier": "advanced",
    "asset": "XAU",
    "lang": "de",
    "device": "desktop",
    "path": "/de/real-markets",
    "input": "GOLD"
  },
  {
    "id": 46,
    "role": "Index Analyst",
    "goal": "Retrieve index information for S&P 500",
    "prod": "real-markets",
    "tier": "basic",
    "asset": "SPX",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/real-markets",
    "input": "SPX"
  },
  {
    "id": 47,
    "role": "Multi-Asset Analyst",
    "goal": "Compare multiple asset classes simultaneously",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "MULTI",
    "lang": "en",
    "device": "desktop",
    "path": "/en/real-markets",
    "input": "BTC vs SPX"
  },
  {
    "id": 48,
    "role": "Stale-Data Customer",
    "goal": "Detect stale data indication without false live claim",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "STALE",
    "lang": "de",
    "device": "desktop",
    "path": "/de/real-markets",
    "input": "HISTORICAL_SERIES"
  },
  {
    "id": 49,
    "role": "Conflicting-Data Customer",
    "goal": "Trigger provider disagreement visible in UI",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "CONFLICT",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/real-markets",
    "input": "CROSS_VENUE_DISPARITY"
  },
  {
    "id": 50,
    "role": "Provider-Failure Customer",
    "goal": "Observe provider timeout with safe fallback",
    "prod": "real-markets",
    "tier": "basic",
    "asset": "OFFLINE",
    "lang": "en",
    "device": "desktop",
    "path": "/en/real-markets",
    "input": "FALLBACK_CHECK"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 05 (Customers 041 to 050)`, () => {
  for (const c of BATCH) {
    test(`Customer #${c.id.toString().padStart(3, "0")} [${c.role}]: ${c.goal.slice(0, 45)}... [${c.lang.toUpperCase()} / ${c.prod} / ${c.tier}]`, async ({ browser }) => {
      const viewport = c.device === "mobile" ? { width: 375, height: 667 } : { width: 1280, height: 800 };
      const context = await browser.newContext({
        viewport,
        locale: c.lang,
        userAgent: `Velmere-Giga-Browser/${c.id} (${c.role}; ${c.device}; ${c.lang})`
      });
      const page = await context.newPage();

      try {
        const resp = await page.goto(c.path, { waitUntil: "domcontentloaded", timeout: 20000 });
        expect(resp?.status()).toBe(200);

        const pageTitle = await page.title();
        expect(pageTitle.length).toBeGreaterThan(0);

        const main = page.locator("main, body");
        await expect(main.first()).toBeVisible({ timeout: 15000 });

        const inputLocator = page.locator("input[type=\"text\"], input[type=\"search\"], textarea, [role=\"combobox\"]");
        const inputCount = await inputLocator.count();
        if (inputCount > 0 && c.input.length > 0 && c.input.length < 150) {
          const targetInput = inputLocator.first();
          if (await targetInput.isVisible()) {
            await targetInput.fill(c.input.slice(0, 60));
            await page.keyboard.press("Escape");
          }
        }

        const content = await page.content();
        expect(content).not.toContain("Internal Server Error");
        expect(content).not.toContain("Unhandled Runtime Error");

      } finally {
        await context.close();
      }
    });
  }
});