import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 51,
    "role": "Market Impact Beginner",
    "goal": "Understand what Market Impact measures",
    "prod": "market-integrity",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/market-integrity",
    "input": "swap:1000:USDC:ETH"
  },
  {
    "id": 52,
    "role": "Market Impact Professional",
    "goal": "Perform deeper impact analysis without fake prediction",
    "prod": "market-integrity",
    "tier": "pro",
    "asset": "BTC",
    "lang": "en",
    "device": "desktop",
    "path": "/en/market-integrity",
    "input": "swap:50000:USDT:BTC"
  },
  {
    "id": 53,
    "role": "Market Impact Skeptic",
    "goal": "Inspect clear non-linear slippage limitations",
    "prod": "market-integrity",
    "tier": "pro",
    "asset": "SOL",
    "lang": "de",
    "device": "desktop",
    "path": "/de/market-integrity",
    "input": "swap:100000:USDC:SOL"
  },
  {
    "id": 54,
    "role": "Whale Watch Beginner",
    "goal": "Understand large transfer and transfer != sale",
    "prod": "market-integrity",
    "tier": "basic",
    "asset": "USDC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/market-integrity",
    "input": "transfer:10000000:USDC"
  },
  {
    "id": 55,
    "role": "Whale Watch Investigator",
    "goal": "Analyze exchange and bridge movements",
    "prod": "market-integrity",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/market-integrity",
    "input": "whale:binance:inflow"
  },
  {
    "id": 56,
    "role": "Whale Watch Ambiguous",
    "goal": "Submit ambiguous transfer and see unclassified label",
    "prod": "market-integrity",
    "tier": "basic",
    "asset": "BTC",
    "lang": "de",
    "device": "desktop",
    "path": "/de/market-integrity",
    "input": "whale:0xunknown:internal"
  },
  {
    "id": 57,
    "role": "Whale Watch Finality User",
    "goal": "Inspect chain finality and reorg handling",
    "prod": "market-integrity",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/market-integrity",
    "input": "finality:block:19000000"
  },
  {
    "id": 58,
    "role": "Risk Indicator Beginner",
    "goal": "Understand risk score methodology and uncertainty",
    "prod": "risk-methodology",
    "tier": "basic",
    "asset": "USDC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/risk-methodology",
    "input": "USDC"
  },
  {
    "id": 59,
    "role": "Risk Indicator Professional",
    "goal": "Inspect historical and versioned risk evidence",
    "prod": "risk-methodology",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/risk-methodology",
    "input": "ETH"
  },
  {
    "id": 60,
    "role": "Risk Indicator Skeptic",
    "goal": "Ask whether score predicts future returns and verify refusal",
    "prod": "risk-methodology",
    "tier": "pro",
    "asset": "BTC",
    "lang": "en",
    "device": "desktop",
    "path": "/en/risk-methodology",
    "input": "Does this score guarantee profit?"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 06 (Customers 051 to 060)`, () => {
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