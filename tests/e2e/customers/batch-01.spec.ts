import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 1,
    "role": "Retail Crypto Beginner",
    "exp": "novice",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "device": "desktop"
  },
  {
    "id": 2,
    "role": "First-time DeFi Investor",
    "exp": "intermediate",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "UNI",
    "device": "mobile"
  },
  {
    "id": 3,
    "role": "Mobile-first Retail Saver",
    "exp": "developer",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "USDC",
    "device": "desktop"
  },
  {
    "id": 4,
    "role": "Skeptical Retail Buyer",
    "exp": "institutional",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "contract Token {}",
    "device": "mobile"
  },
  {
    "id": 5,
    "role": "Non-Technical Token Holder",
    "exp": "adversarial",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "USDT",
    "device": "desktop"
  },
  {
    "id": 6,
    "role": "Cautious German Investor",
    "exp": "novice",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "SPX",
    "device": "mobile"
  },
  {
    "id": 7,
    "role": "Curious Web3 Explorer",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "reentrancy attack",
    "device": "desktop"
  },
  {
    "id": 8,
    "role": "Price-Sensitive Retail User",
    "exp": "developer",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "ETH",
    "device": "mobile"
  },
  {
    "id": 9,
    "role": "Accessibility-dependent User",
    "exp": "institutional",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "cluster",
    "device": "desktop"
  },
  {
    "id": 10,
    "role": "Casual Airdrop Hunter",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "0x000000000000000000000000000000000000dead",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 01 (Customers 001-010)`, () => {
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