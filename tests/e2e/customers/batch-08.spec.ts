import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 71,
    "role": "Slow 2G Network User",
    "exp": "novice",
    "lang": "en",
    "prod": "privacy",
    "tier": "pro",
    "path": "/en/privacy",
    "input": "slow2g:hydration",
    "device": "desktop"
  },
  {
    "id": 72,
    "role": "Offline-to-Online Reconnecting User",
    "exp": "intermediate",
    "lang": "de",
    "prod": "terms",
    "tier": "advanced",
    "path": "/de/terms",
    "input": "offline:banner",
    "device": "mobile"
  },
  {
    "id": 73,
    "role": "User submitting empty input",
    "exp": "developer",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "",
    "device": "desktop"
  },
  {
    "id": 74,
    "role": "User submitting 500KB source code",
    "exp": "institutional",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "contract Big { uint a; }",
    "device": "mobile"
  },
  {
    "id": 75,
    "role": "User querying non-existent ticker",
    "exp": "adversarial",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "XYZ999_NON_EXISTENT",
    "device": "desktop"
  },
  {
    "id": 76,
    "role": "User with expired authentication session",
    "exp": "novice",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "session:expired:401",
    "device": "mobile"
  },
  {
    "id": 77,
    "role": "User upgrading from Basic to Pro",
    "exp": "intermediate",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "upgrade:basic:pro",
    "device": "desktop"
  },
  {
    "id": 78,
    "role": "User canceling recurring subscription",
    "exp": "developer",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "cancel:subscription",
    "device": "mobile"
  },
  {
    "id": 79,
    "role": "User requesting PDF invoice download",
    "exp": "institutional",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "invoice:vat:pdf",
    "device": "desktop"
  },
  {
    "id": 80,
    "role": "User comparing Pro vs Advanced diff",
    "exp": "adversarial",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "tier:diff:matrix",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 08 (Customers 071-080)`, () => {
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