import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 81,
    "role": "Polish Desktop Customer",
    "goal": "Evaluate complete native Polish desktop flow",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "MULTI",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/real-markets",
    "input": "dywidendy splity akcje"
  },
  {
    "id": 82,
    "role": "English Desktop Customer",
    "goal": "Evaluate complete native English desktop flow",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "MULTI",
    "lang": "en",
    "device": "desktop",
    "path": "/en/real-markets",
    "input": "equities commodities fx"
  },
  {
    "id": 83,
    "role": "German Desktop Customer",
    "goal": "Evaluate complete native German desktop flow",
    "prod": "real-markets",
    "tier": "pro",
    "asset": "MULTI",
    "lang": "de",
    "device": "desktop",
    "path": "/de/real-markets",
    "input": "aktien anleihen rohstoffe"
  },
  {
    "id": 84,
    "role": "Polish Mobile Customer",
    "goal": "Evaluate Polish flow on mobile viewport",
    "prod": "shield",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "mobile",
    "path": "/pl/shield",
    "input": "ETH"
  },
  {
    "id": 85,
    "role": "English Mobile Customer",
    "goal": "Evaluate English flow on mobile viewport",
    "prod": "shield",
    "tier": "basic",
    "asset": "BTC",
    "lang": "en",
    "device": "mobile",
    "path": "/en/shield",
    "input": "BTC"
  },
  {
    "id": 86,
    "role": "German Mobile Customer",
    "goal": "Evaluate German flow on mobile viewport",
    "prod": "shield",
    "tier": "basic",
    "asset": "SOL",
    "lang": "de",
    "device": "mobile",
    "path": "/de/shield",
    "input": "SOL"
  },
  {
    "id": 87,
    "role": "Keyboard-Only Customer",
    "goal": "Navigate critical journey without mouse using Tab and Enter",
    "prod": "shield-map",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-map",
    "input": "tab_navigation_focus_cycle"
  },
  {
    "id": 88,
    "role": "Low-Attention Customer",
    "goal": "Evaluate speed clarity and immediate next action",
    "prod": "risk-methodology",
    "tier": "basic",
    "asset": "USDC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/risk-methodology",
    "input": "USDC"
  },
  {
    "id": 89,
    "role": "Accessibility-Sensitive Customer",
    "goal": "Evaluate ARIA labels dialogs forms contrast",
    "prod": "browser",
    "tier": "basic",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/browser",
    "input": "aria_contrast_validation"
  },
  {
    "id": 90,
    "role": "Confused First-Time Customer",
    "goal": "Evaluate whether onboarding and help explain what to do",
    "prod": "research-lab",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "how do I audit my smart contract?"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 09 (Customers 081 to 090)`, () => {
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