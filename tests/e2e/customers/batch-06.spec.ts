import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 51,
    "role": "Polish Corporate Compliance Officer",
    "exp": "novice",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "dywidendy:splity",
    "device": "desktop"
  },
  {
    "id": 52,
    "role": "German BaFin Regulatory Specialist",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "bafin:aufsichtsrecht",
    "device": "mobile"
  },
  {
    "id": 53,
    "role": "International Expat Trader",
    "exp": "developer",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "switch:currency:locale",
    "device": "desktop"
  },
  {
    "id": 54,
    "role": "Polish Web3 Student",
    "exp": "institutional",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "nauka:smart:kontrakty",
    "device": "mobile"
  },
  {
    "id": 55,
    "role": "Austrian Crypto Accountant",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "din5008:eur:format",
    "device": "desktop"
  },
  {
    "id": 56,
    "role": "Swiss Private Banker",
    "exp": "novice",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "sicherheit:schweiz",
    "device": "mobile"
  },
  {
    "id": 57,
    "role": "Polish DeFi Yield Optimizer",
    "exp": "intermediate",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "poslizg:plynnosc",
    "device": "desktop"
  },
  {
    "id": 58,
    "role": "German Token Engineer",
    "exp": "developer",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "schwachstellen:schweregrad",
    "device": "mobile"
  },
  {
    "id": 59,
    "role": "Polish FinTech Journalist",
    "exp": "institutional",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "metodologia:transparentnosc",
    "device": "desktop"
  },
  {
    "id": 60,
    "role": "European Union GDPR Auditor",
    "exp": "adversarial",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "gdpr:article:13",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 06 (Customers 051-060)`, () => {
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