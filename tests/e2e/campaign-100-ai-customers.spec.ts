import { test, expect } from "@playwright/test";

const PERSONAS = [
  { id: 1, role: "Retail Crypto Beginner", exp: "novice", lang: "pl", prod: "shield", tier: "basic", path: "/pl/shield", query: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
  { id: 2, role: "First-time DeFi Investor", exp: "novice", lang: "en", prod: "browser", tier: "basic", path: "/en/browser", query: "UNI" },
  { id: 3, role: "Mobile-first Retail Saver", exp: "novice", lang: "de", prod: "risk-methodology", tier: "basic", path: "/de/risk-methodology", query: "USDC" },
  { id: 4, role: "Skeptical Retail Buyer", exp: "novice", lang: "pl", prod: "research-lab", tier: "basic", path: "/pl/research-lab", query: "contract Token {}" },
  { id: 5, role: "Non-Technical Token Holder", exp: "novice", lang: "en", prod: "market-integrity", tier: "basic", path: "/en/market-integrity", query: "USDT" },
  { id: 6, role: "Cautious German Investor", exp: "novice", lang: "de", prod: "real-markets", tier: "basic", path: "/de/real-markets", query: "SPX" },
  { id: 7, role: "Curious Web3 Explorer", exp: "novice", lang: "pl", prod: "research-lab", tier: "basic", path: "/pl/research-lab", query: "reentrancy" },
  { id: 8, role: "Price-Sensitive Retail User", exp: "novice", lang: "en", prod: "market-integrity", tier: "basic", path: "/en/market-integrity", query: "ETH" },
  { id: 9, role: "Accessibility-dependent User", exp: "novice", lang: "de", prod: "shield-map", tier: "basic", path: "/de/shield-map", query: "cluster" },
  { id: 10, role: "Casual Airdrop Hunter", exp: "novice", lang: "pl", prod: "browser", tier: "basic", path: "/pl/browser", query: "0x000000000000000000000000000000000000dead" },
  { id: 11, role: "Active Spot Trader", exp: "intermediate", lang: "en", prod: "shield", tier: "pro", path: "/en/shield", query: "ETH-USDT" },
  { id: 12, role: "DeFi Yield Farmer", exp: "intermediate", lang: "pl", prod: "research-lab", tier: "pro", path: "/pl/research-lab", query: "Vault" },
  { id: 13, role: "Quantitative Market Analyst", exp: "intermediate", lang: "de", prod: "real-markets", tier: "pro", path: "/de/real-markets", query: "BTC" },
  { id: 14, role: "Derivatives Swing Trader", exp: "intermediate", lang: "en", prod: "shield-pro", tier: "pro", path: "/en/shield-pro", query: "BTC-PERP" },
  { id: 15, role: "Cross-chain Arbitrageur", exp: "intermediate", lang: "pl", prod: "shield-map", tier: "pro", path: "/pl/shield-map", query: "polygon" },
  { id: 16, role: "Multi-asset Portfolio Manager", exp: "intermediate", lang: "de", prod: "browser", tier: "pro", path: "/de/browser", query: "portfolio" },
  { id: 17, role: "On-chain Detective", exp: "intermediate", lang: "en", prod: "market-integrity", tier: "pro", path: "/en/market-integrity", query: "whale" },
  { id: 18, role: "DeFi Governance Delegate", exp: "intermediate", lang: "pl", prod: "research-lab", tier: "pro", path: "/pl/research-lab", query: "timelock" },
  { id: 19, role: "Automated Bot Operator", exp: "intermediate", lang: "de", prod: "market-integrity", tier: "pro", path: "/de/market-integrity", query: "slippage" },
  { id: 20, role: "Risk Committee Member", exp: "intermediate", lang: "en", prod: "risk-methodology", tier: "pro", path: "/en/risk-methodology", query: "counterparty" }
];

test.describe("Velmere - Browser AI Customers Verification", () => {
  test("executes representative browser customer journeys against running frontend", async ({ page }) => {
    for (const p of PERSONAS) {
      const resp = await page.goto(p.path, { waitUntil: "domcontentloaded" });
      expect(resp?.status()).toBe(200);
      
      const pageTitle = await page.title();
      expect(pageTitle.length).toBeGreaterThan(0);
      
      const main = page.locator("main, body");
      await expect(main.first()).toBeVisible();
    }
  });
});