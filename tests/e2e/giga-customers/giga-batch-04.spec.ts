import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 31,
    "role": "DEX Liquidity Investigator",
    "goal": "Inspect DEX spread and depth",
    "prod": "shield-pro",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-pro",
    "input": "ETH-USDT"
  },
  {
    "id": 32,
    "role": "Depth-Drift Analyst",
    "goal": "Identify liquidity deterioration",
    "prod": "shield-pro",
    "tier": "pro",
    "asset": "BTC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield-pro",
    "input": "BTC-USDC"
  },
  {
    "id": 33,
    "role": "Drain-Risk Investigator",
    "goal": "Understand drain-risk signals",
    "prod": "shield-pro",
    "tier": "pro",
    "asset": "SOL",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield-pro",
    "input": "SOL-USDC"
  },
  {
    "id": 34,
    "role": "Bridge Investigator",
    "goal": "Inspect cross-chain bridge evidence",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "POLYGON",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-pro",
    "input": "Polygon Bridge"
  },
  {
    "id": 35,
    "role": "Collateral Analyst",
    "goal": "Understand collateral haircut information",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "BTC",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield-pro",
    "input": "WBTC Collateral"
  },
  {
    "id": 36,
    "role": "Cross-Chain Analyst",
    "goal": "Compare evidence across chains",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "AVAX",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield-pro",
    "input": "Avalanche Bridge"
  },
  {
    "id": 37,
    "role": "Network Graph User",
    "goal": "Find relationships between addresses and assets",
    "prod": "shield-map",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-map",
    "input": "cluster:vitalik.eth"
  },
  {
    "id": 38,
    "role": "Unknown-Identity User",
    "goal": "Shield Map unknown address without guessed identity",
    "prod": "shield-map",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield-map",
    "input": "0x1111111111111111111111111111111111111111"
  },
  {
    "id": 39,
    "role": "Ambiguous-Entity User",
    "goal": "Shield Map ambiguous search term handled safely",
    "prod": "shield-map",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield-map",
    "input": "binance cold storage"
  },
  {
    "id": 40,
    "role": "Mobile Map User",
    "goal": "Touch search graph usability responsive behavior",
    "prod": "shield-map",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "mobile",
    "path": "/en/shield-map",
    "input": "ethereum cluster"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 04 (Customers 031 to 040)`, () => {
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