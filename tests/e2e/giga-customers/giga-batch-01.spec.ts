import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 1,
    "role": "Crypto Beginner",
    "goal": "I own BTC and want to know whether the asset is currently associated with risk",
    "prod": "shield",
    "tier": "basic",
    "asset": "BTC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/shield",
    "input": "BTC"
  },
  {
    "id": 2,
    "role": "Ethereum Developer",
    "goal": "Check whether this contract has obvious security concerns",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "contract Vault { address owner; function withdraw() external {} }"
  },
  {
    "id": 3,
    "role": "Solana Trader",
    "goal": "Check risk of a token I am considering",
    "prod": "shield",
    "tier": "pro",
    "asset": "SOL",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield",
    "input": "SOL"
  },
  {
    "id": 4,
    "role": "Institutional ETH Analyst",
    "goal": "Perform a deeper review of a major Ethereum asset",
    "prod": "shield-pro",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield-pro",
    "input": "ETH"
  },
  {
    "id": 5,
    "role": "Price-Sensitive Retail User",
    "goal": "Can I get a useful answer for free and what would Pro add",
    "prod": "research-lab",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/research-lab",
    "input": "contract Token {}"
  },
  {
    "id": 6,
    "role": "Security Engineer",
    "goal": "Find authorization and ownership risks in a smart contract",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/research-lab",
    "input": "contract Ownable { address public owner; }"
  },
  {
    "id": 7,
    "role": "Advanced Smart-Contract Reviewer",
    "goal": "Perform deep audit and compare Advanced output with Pro",
    "prod": "research-lab",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "formal verification lemma: solvency"
  },
  {
    "id": 8,
    "role": "Non-Technical ETH Holder",
    "goal": "Explain this contract risk in simple language",
    "prod": "browser",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/browser",
    "input": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
  },
  {
    "id": 9,
    "role": "Data-Hungry Developer",
    "goal": "I need machine-readable information about this contract",
    "prod": "browser",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/browser",
    "input": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  },
  {
    "id": 10,
    "role": "Compliance Analyst",
    "goal": "Create an evidence package suitable for an internal review",
    "prod": "browser",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/browser",
    "input": "portfolio export evidence pack"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 01 (Customers 001 to 010)`, () => {
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