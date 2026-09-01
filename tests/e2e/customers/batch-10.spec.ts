import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 91,
    "role": "Multi-Coin Comparison Trader",
    "exp": "novice",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "btc:vs:eth:vs:sol",
    "device": "desktop"
  },
  {
    "id": 92,
    "role": "Cross-Chain Protocol Validator",
    "exp": "intermediate",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "arbitrum:vs:optimism",
    "device": "mobile"
  },
  {
    "id": 93,
    "role": "Provider Provenance Auditor",
    "exp": "developer",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "ecb:vs:binance:kraken",
    "device": "desktop"
  },
  {
    "id": 94,
    "role": "Tier Value Evaluator (Basic vs Pro)",
    "exp": "institutional",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "basic:vs:pro:ast:diff",
    "device": "mobile"
  },
  {
    "id": 95,
    "role": "Scratch Audit Engineer",
    "exp": "adversarial",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "contract NewToken {}",
    "device": "desktop"
  },
  {
    "id": 96,
    "role": "Deep Risk Investigator",
    "exp": "novice",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "volatility:decay:model",
    "device": "mobile"
  },
  {
    "id": 97,
    "role": "Market Intelligence Analyst",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "liquidity:drain:metrics",
    "device": "desktop"
  },
  {
    "id": 98,
    "role": "Suspicious Activity Tracker",
    "exp": "developer",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "honeypot:blacklist",
    "device": "mobile"
  },
  {
    "id": 99,
    "role": "End-to-End Enterprise Journey Evaluator",
    "exp": "institutional",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "institutional:checkout",
    "device": "desktop"
  },
  {
    "id": 100,
    "role": "Hostile Red Team Lead",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "hostile:red:team:payload",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 10 (Customers 091-100)`, () => {
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