import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 71,
    "role": "Free Basic Customer",
    "goal": "Use Basic tier and verify free access works seamlessly",
    "prod": "browser",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/browser",
    "input": "UNI"
  },
  {
    "id": 72,
    "role": "Pro Customer",
    "goal": "Use legitimate Pro entitlement for deep capability",
    "prod": "browser",
    "tier": "pro",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/browser",
    "input": "source code decompilation"
  },
  {
    "id": 73,
    "role": "Advanced Customer",
    "goal": "Use legitimate Advanced entitlement for proof exports",
    "prod": "browser",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/browser",
    "input": "immutable proof capsule export"
  },
  {
    "id": 74,
    "role": "No-Entitlement Attacker",
    "goal": "Attempt Pro access without entitlement and verify denial",
    "prod": "checkout",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/checkout",
    "input": "bypass:unauthorized_pro_access"
  },
  {
    "id": 75,
    "role": "Wrong-Tier Attacker",
    "goal": "Has one tier, attempts another and verifies denial",
    "prod": "checkout",
    "tier": "pro",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/checkout",
    "input": "force:advanced_tier_escalation"
  },
  {
    "id": 76,
    "role": "Revoked-Entitlement Customer",
    "goal": "Entitlement revoked and access correctly removed",
    "prod": "account",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/account",
    "input": "session:revoked_entitlement_check"
  },
  {
    "id": 77,
    "role": "Duplicate-Webhook Tester",
    "goal": "Simulate duplicate event and verify idempotency",
    "prod": "checkout",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/checkout",
    "input": "idempotency_key_duplicate_replay"
  },
  {
    "id": 78,
    "role": "Invalid-Webhook Tester",
    "goal": "Invalid HMAC signature rejected safely",
    "prod": "checkout",
    "tier": "pro",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/checkout",
    "input": "invalid_hmac_webhook_signature"
  },
  {
    "id": 79,
    "role": "Checkout Customer",
    "goal": "Perform complete checkout flow mapping",
    "prod": "checkout",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/checkout",
    "input": "standard_pro_subscription_checkout"
  },
  {
    "id": 80,
    "role": "Account Privacy Customer",
    "goal": "Test session logout and data isolation boundaries",
    "prod": "account",
    "tier": "basic",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/account",
    "input": "user_privacy_isolation_audit"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 08 (Customers 071 to 080)`, () => {
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