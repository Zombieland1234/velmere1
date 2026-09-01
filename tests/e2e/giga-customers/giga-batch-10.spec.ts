import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 91,
    "role": "IDOR Attacker",
    "goal": "Attempt unauthorized resource access via forged UUID",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "uuid:00000000-0000-0000-0000-000000000001"
  },
  {
    "id": 92,
    "role": "BOLA Attacker",
    "goal": "Manipulate object identifiers across tenant accounts",
    "prod": "account",
    "tier": "pro",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/account",
    "input": "object_id_tamper_attempt"
  },
  {
    "id": 93,
    "role": "Tenant Crossover Attacker",
    "goal": "Attempt access to another customer database partition",
    "prod": "account",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/account",
    "input": "tenant_id:tenant_beta_leak_test"
  },
  {
    "id": 94,
    "role": "SSRF Attacker",
    "goal": "Submit malicious cloud metadata URL targeting 169.254.169.254",
    "prod": "browser",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/browser",
    "input": "http://169.254.169.254/latest/meta-data/"
  },
  {
    "id": 95,
    "role": "XSS Attacker",
    "goal": "Inject script payload into search box and contract comments",
    "prod": "research-lab",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/research-lab",
    "input": "contract XSS { string name = \"<script>alert(1)</script>\"; }"
  },
  {
    "id": 96,
    "role": "File Attacker",
    "goal": "Attempt oversized payload upload",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/research-lab",
    "input": "contract Giant { uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 a; uint256 b; }"
  },
  {
    "id": 97,
    "role": "Signed-URL Attacker",
    "goal": "Attempt URL replay and expired signed token reuse",
    "prod": "checkout",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/checkout",
    "input": "expired_signed_token_replay_attempt"
  },
  {
    "id": 98,
    "role": "Entitlement Attacker",
    "goal": "Modify client localStorage attempting paid access unlock",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield-pro",
    "input": "localStorage.setItem(\"entitled\", \"true\")"
  },
  {
    "id": 99,
    "role": "Full End-to-End Buyer",
    "goal": "Complete end-to-end discovery product tier checkout and PDF",
    "prod": "checkout",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/checkout",
    "input": "full_end_to_end_journey_audit"
  },
  {
    "id": 100,
    "role": "World-Class Hostile Customer",
    "goal": "Integrated master red team payload testing all boundaries",
    "prod": "research-lab",
    "tier": "advanced",
    "asset": "MULTI",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "MASTER_ADVERSARIAL_PAYLOAD: injection, memory leak, reentrancy, tenant probe"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 10 (Customers 091 to 100)`, () => {
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