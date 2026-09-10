import assert from "node:assert/strict";
import { analyzeTokenRisk } from "../../lib/market-integrity/risk-engine.ts";
import type { TokenRiskInput } from "../../lib/market-integrity/risk-types.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS 004: RISK ENGINE SENSITIVITY & BOUNDS AUDIT ===");

  const baseline: TokenRiskInput = {
    symbol: "BASE",
    name: "Baseline Token",
    currentPrice: 10.0,
    athPrice: 15.0,
    marketCap: 100_000_000,
    fdv: 120_000_000,
    liquidityUsd: 10_000_000,
    volume24h: 5_000_000,
    priceChange24h: 0.0,
    priceChange7d: 1.0,
    priceChange30d: 2.0,
    top10HolderPercent: 15,
    holderCount: 10_000,
    buyTaxPercentage: 0,
    sellTaxPercentage: 0,
    isHoneypot: false,
    canMintNewTokens: false,
    canBlacklist: false,
    providerHealthScore: 100,
    dataSources: ["dexscreener", "coingecko"],
    freshnessSeconds: 30,
    freshnessState: "fresh",
    assetClass: "crypto",
  };

  const baseResult = analyzeTokenRisk(baseline, "live");
  ok(baseResult.score >= 0 && baseResult.score <= 100, "Base score in [0, 100]");
  ok(Number.isFinite(baseResult.score), "Base score is finite");

  // 1. Sensitivity: Honeypot toggle
  const honeypotResult = analyzeTokenRisk({ ...baseline, isHoneypot: true }, "live");
  ok(honeypotResult.score > baseResult.score, "Honeypot strictly increases risk score");
  ok(honeypotResult.score >= 80, `Honeypot enforces critical floor >= 80 (got ${honeypotResult.score})`);

  // 2. Sensitivity: Mint capability toggle
  const mintResult = analyzeTokenRisk({ ...baseline, canMintNewTokens: true }, "live");
  ok(mintResult.score > baseResult.score, "Mint capability increases risk score");

  // 3. Sensitivity: Blacklist capability toggle
  const blacklistResult = analyzeTokenRisk({ ...baseline, canBlacklist: true }, "live");
  ok(blacklistResult.score > baseResult.score, "Blacklist capability increases risk score");

  // 4. Sensitivity: Holder Concentration (15% vs 85%)
  const highConcentrationResult = analyzeTokenRisk({ ...baseline, top10HolderPercent: 85 }, "live");
  ok(highConcentrationResult.score > baseResult.score, "High holder concentration increases risk score");

  // 5. Sensitivity: Liquidity Drop ($10M vs $5K)
  const thinLiquidityResult = analyzeTokenRisk({ ...baseline, liquidityUsd: 5_000 }, "live");
  ok(thinLiquidityResult.score > baseResult.score, "Thin liquidity increases risk score");

  // 6. Sensitivity: Sell Tax (0% vs 25%)
  const taxResult = analyzeTokenRisk({ ...baseline, sellTaxPercentage: 25 }, "live");
  ok(taxResult.score > baseResult.score, "Sell tax increases risk score");

  // 7. Sensitivity: Severe Price Drop (0% vs -60%)
  const crashResult = analyzeTokenRisk({ ...baseline, priceChange24h: -60 }, "live");
  ok(crashResult.score > baseResult.score, "Crash increases risk score");

  // 8. Sensitivity: Stale Provider Degradation
  const staleResult = analyzeTokenRisk({ ...baseline, freshnessSeconds: 86400, freshnessState: "stale" }, "stale");
  ok(staleResult.confidence < baseResult.confidence, "Stale feed strictly decreases confidence");

  // 9. Invariant: 500 randomized perturbation iterations without NaN/Infinity or out-of-range scores
  for (let i = 0; i < 500; i++) {
    const perturbed: TokenRiskInput = {
      ...baseline,
      currentPrice: Math.max(0.000001, Math.random() * 1000),
      marketCap: Math.max(1000, Math.random() * 1e9),
      liquidityUsd: Math.max(100, Math.random() * 1e8),
      volume24h: Math.max(0, Math.random() * 1e8),
      priceChange24h: (Math.random() - 0.5) * 100,
      top10HolderPercent: Math.min(100, Math.max(0, Math.random() * 100)),
      buyTaxPercentage: Math.min(100, Math.max(0, Math.random() * 30)),
      sellTaxPercentage: Math.min(100, Math.max(0, Math.random() * 30)),
      isHoneypot: Math.random() > 0.8,
      canMintNewTokens: Math.random() > 0.7,
      canBlacklist: Math.random() > 0.7,
    };
    const res = analyzeTokenRisk(perturbed, "live");
    assert.ok(Number.isFinite(res.score), `Perturbation ${i}: score must be finite`);
    assert.ok(res.score >= 0 && res.score <= 100, `Perturbation ${i}: score must be in [0, 100], got ${res.score}`);
    assert.ok(Number.isFinite(res.confidence), `Perturbation ${i}: confidence must be finite`);
    assert.ok(res.confidence >= 0 && res.confidence <= 1, `Perturbation ${i}: confidence in [0, 1]`);
  }
  assertions += 1;
  ok(true, "500 randomized perturbation runs passed with zero NaN/Infinity or bounds violations");

  console.log(`PASS 004 Risk Engine Sensitivity Audit: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
