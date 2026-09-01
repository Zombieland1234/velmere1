import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 21,
    "role": "Junior Solidity Developer",
    "exp": "novice",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "contract ERC20Permit {}",
    "device": "desktop"
  },
  {
    "id": 22,
    "role": "Senior Protocol Architect",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "flashLoan",
    "device": "mobile"
  },
  {
    "id": 23,
    "role": "Security Researcher Auditor",
    "exp": "developer",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "lemma:solvency",
    "device": "desktop"
  },
  {
    "id": 24,
    "role": "Token Founder preparing Mainnet",
    "exp": "institutional",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "diff:remediation",
    "device": "mobile"
  },
  {
    "id": 25,
    "role": "Fullstack Web3 Integrator",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "lookup:contract",
    "device": "desktop"
  },
  {
    "id": 26,
    "role": "dApp Frontend Engineer",
    "exp": "novice",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "widget:embed",
    "device": "mobile"
  },
  {
    "id": 27,
    "role": "EVM Tooling Maintainer",
    "exp": "intermediate",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "ast:slither",
    "device": "desktop"
  },
  {
    "id": 28,
    "role": "Cross-chain Bridge Engineer",
    "exp": "developer",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "relayer:l1-l2",
    "device": "mobile"
  },
  {
    "id": 29,
    "role": "Algorithmic Market Maker Dev",
    "exp": "institutional",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "orderbook:depth",
    "device": "desktop"
  },
  {
    "id": 30,
    "role": "AI Web3 Prompt Security Dev",
    "exp": "adversarial",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "prompt:boundary",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 03 (Customers 021-030)`, () => {
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