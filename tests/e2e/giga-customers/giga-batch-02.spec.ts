import { test, expect } from "@playwright/test";

const BATCH = [
  {
    "id": 11,
    "role": "Ownership-Risk Investigator",
    "goal": "Audit suspicious ownership pattern",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "contract AdminRisk { function setOwner(address newOwner) public {} }"
  },
  {
    "id": 12,
    "role": "Reentrancy Investigator",
    "goal": "Audit contract with reentrancy-like behavior",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/research-lab",
    "input": "contract Reentrancy { function withdraw() public { msg.sender.call('); balances[msg.sender]=0; } }"
  },
  {
    "id": 13,
    "role": "Proxy Upgrade Investigator",
    "goal": "Check upgradeability and implementation separation",
    "prod": "research-lab",
    "tier": "advanced",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/research-lab",
    "input": "contract Proxy { address implementation; }"
  },
  {
    "id": 14,
    "role": "Token Contract Reviewer",
    "goal": "Review ERC-style token contract behavior",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "contract ERC20Token { function transfer() public {} }"
  },
  {
    "id": 15,
    "role": "Unverified-Contract User",
    "goal": "Submit unverified contract and observe safe handling",
    "prod": "browser",
    "tier": "basic",
    "asset": "ETH",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/browser",
    "input": "0x000000000000000000000000000000000000dead"
  },
  {
    "id": 16,
    "role": "Malformed-Input User",
    "goal": "Submit malformed address input",
    "prod": "browser",
    "tier": "basic",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/browser",
    "input": "0xINVALID_ADDRESS_STRING"
  },
  {
    "id": 17,
    "role": "Unknown-Asset User",
    "goal": "Search unsupported asset",
    "prod": "shield",
    "tier": "basic",
    "asset": "UNKNOWN_COIN",
    "lang": "en",
    "device": "desktop",
    "path": "/en/shield",
    "input": "NON_EXISTENT_TICKER_XYZ"
  },
  {
    "id": 18,
    "role": "Evidence-Skeptic",
    "goal": "Challenge every major conclusion",
    "prod": "risk-methodology",
    "tier": "pro",
    "asset": "BTC",
    "lang": "pl",
    "device": "desktop",
    "path": "/pl/risk-methodology",
    "input": "BTC"
  },
  {
    "id": 19,
    "role": "False-Certainty User",
    "goal": "Ask for guaranteed safety",
    "prod": "research-lab",
    "tier": "basic",
    "asset": "ETH",
    "lang": "de",
    "device": "desktop",
    "path": "/de/research-lab",
    "input": "Is this token 100% safe guaranteed?"
  },
  {
    "id": 20,
    "role": "Remediation-Focused Developer",
    "goal": "Needs concrete remediation guidance",
    "prod": "research-lab",
    "tier": "pro",
    "asset": "ETH",
    "lang": "en",
    "device": "desktop",
    "path": "/en/research-lab",
    "input": "remediation diffs for reentrancy"
  }
];

test.describe(`Velmere — Giga 100 AI Customers Batch 02 (Customers 011 to 020)`, () => {
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