import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 61,
    "role": "Blind Screen Reader User",
    "exp": "novice",
    "lang": "pl",
    "prod": "shield",
    "tier": "basic",
    "path": "/pl/shield",
    "input": "aria:announcements",
    "device": "desktop"
  },
  {
    "id": 62,
    "role": "Keyboard-Only Power User",
    "exp": "intermediate",
    "lang": "en",
    "prod": "browser",
    "tier": "pro",
    "path": "/en/browser",
    "input": "tab:keyboard:trap",
    "device": "mobile"
  },
  {
    "id": 63,
    "role": "Low-Vision Zoom User",
    "exp": "developer",
    "lang": "de",
    "prod": "risk-methodology",
    "tier": "advanced",
    "path": "/de/risk-methodology",
    "input": "zoom:200:table",
    "device": "desktop"
  },
  {
    "id": 64,
    "role": "Reduced Motion Preference User",
    "exp": "institutional",
    "lang": "pl",
    "prod": "research-lab",
    "tier": "basic",
    "path": "/pl/research-lab",
    "input": "css:reduced:motion",
    "device": "mobile"
  },
  {
    "id": 65,
    "role": "High-Contrast Mode User",
    "exp": "adversarial",
    "lang": "en",
    "prod": "market-integrity",
    "tier": "pro",
    "path": "/en/market-integrity",
    "input": "wcag:aaa:contrast",
    "device": "desktop"
  },
  {
    "id": 66,
    "role": "Motor Impaired Touch User",
    "exp": "novice",
    "lang": "de",
    "prod": "real-markets",
    "tier": "advanced",
    "path": "/de/real-markets",
    "input": "touch:44px:target",
    "device": "mobile"
  },
  {
    "id": 67,
    "role": "Cognitive Load Sensitive User",
    "exp": "intermediate",
    "lang": "pl",
    "prod": "shield-map",
    "tier": "basic",
    "path": "/pl/shield-map",
    "input": "cognitive:simplicity",
    "device": "desktop"
  },
  {
    "id": 68,
    "role": "Color Blind Trader",
    "exp": "developer",
    "lang": "en",
    "prod": "shield-pro",
    "tier": "pro",
    "path": "/en/shield-pro",
    "input": "colorblind:shapes",
    "device": "mobile"
  },
  {
    "id": 69,
    "role": "Assistive Switch Device User",
    "exp": "institutional",
    "lang": "de",
    "prod": "checkout",
    "tier": "advanced",
    "path": "/de/checkout",
    "input": "switch:sequential",
    "device": "desktop"
  },
  {
    "id": 70,
    "role": "Dyslexic Crypto Reader",
    "exp": "adversarial",
    "lang": "pl",
    "prod": "account",
    "tier": "basic",
    "path": "/pl/account",
    "input": "dyslexic:typography",
    "device": "mobile"
  }
];

test.describe(`Velmere - 100 AI Customers Batch 07 (Customers 061-070)`, () => {
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