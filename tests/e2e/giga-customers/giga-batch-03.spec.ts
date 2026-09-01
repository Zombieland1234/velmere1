import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 21,
    "role": "BTC Risk User",
    "goal": "Understand current BTC risk state",
    "prod": "shield",
    "tier": "basic",
    "asset": "BTC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield",
    "input": "BTC"
  },
  {
    "id": 22,
    "role": "ETH Risk User",
    "goal": "Compare multiple risk dimensions for ETH",
    "prod": "shield",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield",
    "input": "ETH"
  },
  {
    "id": 23,
    "role": "SOL Advanced User",
    "goal": "Inspect deeper multi-source evidence for SOL",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "SOL",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield-pro",
    "input": "SOL"
  },
  {
    "id": 24,
    "role": "XRP User",
    "goal": "Verify asset lookup and evidence for XRP",
    "prod": "shield",
    "tier": "basic",
    "asset": "XRP",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield",
    "input": "XRP"
  },
  {
    "id": 25,
    "role": "ADA User",
    "goal": "Test non-top-tier asset coverage for ADA",
    "prod": "shield",
    "tier": "basic",
    "asset": "ADA",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield",
    "input": "ADA"
  },
  {
    "id": 26,
    "role": "AVAX User",
    "goal": "Inspect chain asset risk for AVAX",
    "prod": "shield",
    "tier": "pro",
    "asset": "AVAX",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield",
    "input": "AVAX"
  },
  {
    "id": 27,
    "role": "LINK User",
    "goal": "Inspect multi-source risk evidence for LINK",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "LINK",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-pro",
    "input": "LINK"
  },
  {
    "id": 28,
    "role": "ARB User",
    "goal": "Evaluate L2 asset risk for ARB",
    "prod": "shield",
    "tier": "basic",
    "asset": "ARB",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield",
    "input": "ARB"
  },
  {
    "id": 29,
    "role": "OP User",
    "goal": "Inspect provider currentness behavior for OP",
    "prod": "shield",
    "tier": "pro",
    "asset": "OP",
    "lang": "de",
    "device": "desktop",
    "path": "/de/shield",
    "input": "OP"
  },
  {
    "id": 30,
    "role": "Stablecoin User",
    "goal": "Check stablecoin specific risks and uncertainty",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "USDC",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-pro",
    "input": "USDC"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 03 (Customers 021 to 030)`, () => {
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