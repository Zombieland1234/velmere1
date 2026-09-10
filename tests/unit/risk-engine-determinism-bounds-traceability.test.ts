import assert from "node:assert/strict";
import { analyzeTokenRisk, levelFromScore, badgeFromLevel } from "../../lib/market-integrity/risk-engine.ts";
import type { TokenRiskInput } from "../../lib/market-integrity/risk-types.ts";
import { RISK_SCORE_FORMULA } from "../../lib/market-integrity/risk-model-binding.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-012: RISK ENGINE DETERMINISM & BOUNDS SUITE ===");

  // 1. Formula & Schema Verification
  ok(RISK_SCORE_FORMULA === "deterministic_continuous_evidence_fusion_v10", "Risk formula version must match canonical specification");

  // 2. Normal Values Test (BTC-like healthy blue-chip crypto)
  const btcInput: TokenRiskInput = {
    symbol: "BTC",
    name: "Bitcoin",
    currentPrice: 92000,
    athPrice: 104000,
    marketCap: 1_800_000_000_000,
    fdv: 1_900_000_000_000,
    liquidityUsd: 15_000_000_000,
    volume24h: 30_000_000_000,
    priceChange24h: 1.5,
    priceChange7d: 3.2,
    priceChange30d: 8.5,
    top10HolderPercent: 8.5,
    holderCount: 50_000_000,
    buyTaxPercentage: 0,
    sellTaxPercentage: 0,
    isHoneypot: false,
    canMintNewTokens: false,
    canBlacklist: false,
    providerHealthScore: 98,
    dataSources: ["coinbase", "binance", "kraken"],
    freshnessSeconds: 10,
    freshnessState: "fresh",
    assetClass: "crypto",
  };

  const btcResult1 = analyzeTokenRisk(btcInput, "live");
  const btcResult2 = analyzeTokenRisk(btcInput, "live");

  // Determinism: identical outputs
  ok(btcResult1.score === btcResult2.score, "Identical inputs must yield identical scores");
  ok(btcResult1.level === btcResult2.level, "Identical inputs must yield identical levels");
  ok(btcResult1.score >= 0 && btcResult1.score <= 35, `BTC blue-chip risk score must be low/moderate, observed: ${btcResult1.score}`);
  ok(btcResult1.level === "low" || btcResult1.level === "very_low", `BTC level must be low/very_low, observed: ${btcResult1.level}`);
  ok(btcResult1.confidence > 0.8, "Healthy blue-chip multi-source data must have high confidence");

  // 3. Missing Values Test (Asset with missing liquidity, volume, holders)
  const missingDataInput: TokenRiskInput = {
    symbol: "UNKNOWN",
    name: "Unknown Coin",
    currentPrice: 1.0,
    dataSources: ["single_unverified_source"],
  };

  const missingResult = analyzeTokenRisk(missingDataInput, "partial");
  ok(missingResult.confidence < 0.6, "Missing critical fields must downgrade confidence below 0.6");
  ok(missingResult.metaModel.limitations.length > 0, "Missing data must generate explicit limitations");
  ok(missingResult.signals.some((s) => s.id === "insufficient_data" || s.id === "unidentified_asset"), "Missing data must trigger insufficient data or unverified signals");

  // 4. Stale Values Test
  const staleInput: TokenRiskInput = {
    ...btcInput,
    symbol: "STALE_BTC",
    freshnessSeconds: 86400, // 24 hours stale
    freshnessState: "stale",
    providerHealthScore: 40,
  };
  const staleResult = analyzeTokenRisk(staleInput, "stale");
  ok(staleResult.signals.some((s) => s.id === "stale_market_data" || s.id === "provider_health_degradation"), "Stale feed must trigger stale or health degradation signal");
  ok(staleResult.confidence < btcResult1.confidence, "Stale feed must reduce confidence compared to fresh feed");

  // 5. Extreme Values Test (Honeypot + 99% Sell Tax + Parabolic Pump)
  const extremeScamInput: TokenRiskInput = {
    symbol: "SCAM",
    name: "Rug Token",
    currentPrice: 0.0001,
    marketCap: 1_000_000,
    fdv: 100_000_000, // Huge FDV gap
    liquidityUsd: 5_000, // Very thin liquidity
    volume24h: 500_000,
    priceChange24h: 850, // 850% parabolic pump
    top10HolderPercent: 95, // 95% concentration
    buyTaxPercentage: 10,
    sellTaxPercentage: 99, // 99% sell tax
    isHoneypot: true,
    canMintNewTokens: true,
    canBlacklist: true,
    dataSources: ["dex"],
  };

  const extremeResult = analyzeTokenRisk(extremeScamInput, "live");
  ok(extremeResult.score >= 80, `Honeypot with 99% tax must have critical score >= 80, observed: ${extremeResult.score}`);
  ok(extremeResult.level === "critical" || extremeResult.level === "high", "Extreme risk level must be critical or high");
  ok(extremeResult.signals.some((s) => s.id === "honeypot_risk"), "Honeypot risk signal must be raised");
  ok(extremeResult.signals.some((s) => s.id === "high_sell_tax"), "High sell tax signal must be raised");

  // 6. Contradictory Values Test (Source Divergence)
  const contradictoryInput: TokenRiskInput = {
    ...btcInput,
    symbol: "DIV_BTC",
    sourceDivergenceBps: 1800, // 18% price divergence across providers
    dataSources: ["provider_a", "provider_b"],
  };
  const contradictoryResult = analyzeTokenRisk(contradictoryInput, "live");
  ok(contradictoryResult.signals.some((s) => s.id === "source_divergence"), "Material divergence must trigger source_divergence signal");
  ok(contradictoryResult.score > btcResult1.score, "Price contradiction must increase risk score relative to normal feed");

  // 7. Bounds & Banding Traceability
  const levels = [
    { score: 5, expected: "low" },
    { score: 25, expected: "low" },
    { score: 45, expected: "medium" },
    { score: 70, expected: "high" },
    { score: 90, expected: "critical" },
  ];
  for (const { score, expected } of levels) {
    const level = levelFromScore(score);
    ok(level === expected, `Score ${score} must map to ${expected}, got ${level}`);
    const badge = badgeFromLevel(level);
    ok(typeof badge === "string" && badge.length > 0, `Badge must have a label for ${level}`);
  }

  // 8. Continuity & Monotonicity Check
  const drop10 = analyzeTokenRisk({ ...btcInput, priceChange24h: -10 });
  const drop30 = analyzeTokenRisk({ ...btcInput, priceChange24h: -30 });
  const drop60 = analyzeTokenRisk({ ...btcInput, priceChange24h: -60 });
  ok(drop30.score >= drop10.score, "Larger price drop must result in equal or greater risk score");
  ok(drop60.score >= drop30.score, "Severe crash must result in equal or greater risk score");

  console.log(`PASS-012 Risk Engine Determinism & Bounds: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
