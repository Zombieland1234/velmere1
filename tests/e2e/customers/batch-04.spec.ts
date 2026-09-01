import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 31,
    "role": "Crypto Hedge Fund Analyst",
    "exp": "novice",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "snapshot:seal",
    "device": "desktop"
  },
  {
    "id": 32,
    "role": "Venture Capital Partner",
    "exp": "intermediate",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "macro:correlation",
    "device": "mobile"
  },
  {
    "id": 33,
    "role": "Institutional Risk Officer",
    "exp": "developer",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "stress:scenario99",
    "device": "desktop"
  },
  {
    "id": 34,
    "role": "Compliance and AML Specialist",
    "exp": "institutional",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "aml:mixer:hop",
    "device": "mobile"
  },
  {
    "id": 35,
    "role": "Family Office CIO",
    "exp": "adversarial",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "pdf:q3:report",
    "device": "desktop"
  },
  {
    "id": 36,
    "role": "Prime Brokerage Collateral Manager",
    "exp": "novice",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "collateral:haircut",
    "device": "mobile"
  },
  {
    "id": 37,
    "role": "Macro Hedge Fund Strategist",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "fx:forward:curve",
    "device": "desktop"
  },
  {
    "id": 38,
    "role": "Crypto Index Product Manager",
    "exp": "developer",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "universe:top50",
    "device": "mobile"
  },
  {
    "id": 39,
    "role": "Asset Management Legal Counsel",
    "exp": "institutional",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "terms:data:rights",
    "device": "desktop"
  },
  {
    "id": 40,
    "role": "Autonomous AI Agent Auditor",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "session:isolation",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 04 (Customers 031-040)`, () => {
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