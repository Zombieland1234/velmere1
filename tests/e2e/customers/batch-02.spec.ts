import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 11,
    "role": "Active Spot Trader",
    "exp": "novice",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "ETH-USDT",
    "device": "desktop"
  },
  {
    "id": 12,
    "role": "DeFi Yield Farmer",
    "exp": "intermediate",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "Vault",
    "device": "mobile"
  },
  {
    "id": 13,
    "role": "Quantitative Market Analyst",
    "exp": "developer",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "BTC",
    "device": "desktop"
  },
  {
    "id": 14,
    "role": "Derivatives Swing Trader",
    "exp": "institutional",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "BTC-PERP",
    "device": "mobile"
  },
  {
    "id": 15,
    "role": "Cross-chain Arbitrageur",
    "exp": "adversarial",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "polygon",
    "device": "desktop"
  },
  {
    "id": 16,
    "role": "Multi-asset Portfolio Manager",
    "exp": "novice",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "portfolio",
    "device": "mobile"
  },
  {
    "id": 17,
    "role": "On-chain Detective",
    "exp": "intermediate",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "whale",
    "device": "desktop"
  },
  {
    "id": 18,
    "role": "DeFi Governance Delegate",
    "exp": "developer",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "timelock",
    "device": "mobile"
  },
  {
    "id": 19,
    "role": "Automated Bot Operator",
    "exp": "institutional",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "slippage",
    "device": "desktop"
  },
  {
    "id": 20,
    "role": "Risk Committee Member",
    "exp": "adversarial",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "counterparty",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 02 (Customers 011-020)`, () => {
  for (const c of BATCH) {
    test(`Customer #${c.id.toString().padStart(3, "0")}: ${c.role} [${c.lang.toUpperCase()} / ${c.prod} / ${c.tier}]`, async ({ browser }) => {
      const viewport = c.device === "mobile" ? { width: 375, height: 667 } : { width: 1280, height: 800 };
      const context = await browser.newContext({
        viewport,
        locale: c.lang,
        userAgent: `Velmere-Customer-Browser/${c.id} (${c.role}; ${c.device})`
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
        if (inputCount > 0 && c.input.length > 0 && c.input.length < 100) {
          const targetInput = inputLocator.first();
          if (await targetInput.isVisible()) {
            await targetInput.fill(c.input.slice(0, 50));
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