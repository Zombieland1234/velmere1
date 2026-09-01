import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 81,
    "role": "Protocol DAO Risk Delegate",
    "exp": "novice",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "dao:governance:report",
    "device": "desktop"
  },
  {
    "id": 82,
    "role": "Venture Fund General Partner",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "lp:radar:pack",
    "device": "mobile"
  },
  {
    "id": 83,
    "role": "Chief Information Security Officer",
    "exp": "developer",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "ciso:guarantee:check",
    "device": "desktop"
  },
  {
    "id": 84,
    "role": "Algorithmic Arbitrage Firm Lead",
    "exp": "institutional",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "algo:slippage:bounds",
    "device": "mobile"
  },
  {
    "id": 85,
    "role": "Digital Asset Custodian Lead",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "custody:inflow:alerts",
    "device": "desktop"
  },
  {
    "id": 86,
    "role": "EU AI Act Compliance Auditor",
    "exp": "novice",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "ai:act:annex:iv",
    "device": "mobile"
  },
  {
    "id": 87,
    "role": "Independent Academic Researcher",
    "exp": "intermediate",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "graph:topology:eval",
    "device": "desktop"
  },
  {
    "id": 88,
    "role": "Crypto Consumer Protection Advocate",
    "exp": "developer",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "consumer:withdrawal:rights",
    "device": "mobile"
  },
  {
    "id": 89,
    "role": "Enterprise Procurement Manager",
    "exp": "institutional",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "procurement:sla:enterprise",
    "device": "desktop"
  },
  {
    "id": 90,
    "role": "Velmere Master Adversarial Auditor",
    "exp": "adversarial",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "master:audit:proof",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 09 (Customers 081-090)`, () => {
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