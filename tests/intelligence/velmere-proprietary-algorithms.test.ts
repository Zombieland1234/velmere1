import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateVelmereProviderConsensus,
  calculateVelmereLiquidityStress,
  calculateVelmereGovernancePower,
  calculateVelmereOracleFragility,
  calculateVelmereExitRisk,
  calculateVelmereDataConfidence,
  calculateVelmereSystemicCorrelation,
  calculateVelmereLiquidityDrawdownShock,
  VELMERE_ALGORITHMS_VERSION,
} from "../../lib/intelligence/velmere-proprietary-algorithms";

describe(`Velmère Proprietary Algorithms (${VELMERE_ALGORITHMS_VERSION})`, () => {
  it("[1/8] VPCS - Provider Consensus Score", () => {
    // Test empty
    const emptyRes = calculateVelmereProviderConsensus([]);
    assert.equal(emptyRes.score, 0);
    assert.equal(emptyRes.agreementGrade, "ANOMALOUS_SPLIT");

    // Test single observation
    const singleRes = calculateVelmereProviderConsensus([
      { providerId: "binance", priceUsd: 65000, observedAtMs: 1000 },
    ]);
    assert.equal(singleRes.score, 50);
    assert.equal(singleRes.sampleCount, 1);

    // Test tight consensus (Binance, Coinbase, Kraken within 0.05%)
    const tightRes = calculateVelmereProviderConsensus([
      { providerId: "binance", priceUsd: 65000, observedAtMs: 1000 },
      { providerId: "coinbase", priceUsd: 65010, observedAtMs: 1020 },
      { providerId: "kraken", priceUsd: 64995, observedAtMs: 1010 },
    ]);
    assert.ok(tightRes.score >= 80, `Expected score >= 80, got ${tightRes.score}`);
    assert.equal(tightRes.agreementGrade, "INSTITUTIONAL_CONSENSUS");
    assert.ok(tightRes.evidenceDigest.length === 64);

    // Test wide divergence (5% divergence)
    const divergentRes = calculateVelmereProviderConsensus([
      { providerId: "binance", priceUsd: 65000, observedAtMs: 1000 },
      { providerId: "dex_pool", priceUsd: 68500, observedAtMs: 1000 },
      { providerId: "outlier", priceUsd: 61500, observedAtMs: 1000 },
    ]);
    assert.ok(divergentRes.score < 50, `Expected divergent score < 50, got ${divergentRes.score}`);
    assert.equal(divergentRes.agreementGrade, "ANOMALOUS_SPLIT");
  });

  it("[2/8] VLSI - Liquidity Stress Index", () => {
    // Test empty book
    const emptyRes = calculateVelmereLiquidityStress([], []);
    assert.equal(emptyRes.score, 0);
    assert.equal(emptyRes.resilienceTier, "CRITICAL_ILLIQUID");

    // Deep institutional order book (BTC/USDT style)
    const deepBids = [
      { price: 65000, quantity: 20 },  // $1.3M
      { price: 64990, quantity: 30 },  // $1.95M
      { price: 64950, quantity: 50 },  // $3.2M
    ];
    const deepAsks = [
      { price: 65001, quantity: 20 },
      { price: 65010, quantity: 30 },
      { price: 65050, quantity: 50 },
    ];
    const deepRes = calculateVelmereLiquidityStress(deepBids, deepAsks, 65000.5);
    assert.ok(deepRes.score >= 70, `Expected deep book score >= 70, got ${deepRes.score}`);
    assert.ok(deepRes.slippage10kPct < 0.1);
    assert.equal(deepRes.resilienceTier, "INSTITUTIONAL_DEEP");

    // Shallow/thin order book
    const thinBids = [{ price: 1.0, quantity: 500 }]; // $500 total
    const thinAsks = [{ price: 1.05, quantity: 500 }];
    const thinRes = calculateVelmereLiquidityStress(thinBids, thinAsks, 1.025);
    assert.ok(thinRes.score <= 40, `Expected thin book score <= 40, got ${thinRes.score}`);
  });

  it("[3/8] VGPI - Governance Power Index", () => {
    // Renounced / immutable contract (0% owner, timelocked)
    const renouncedRes = calculateVelmereGovernancePower({
      ownerType: "zero_address_renounced",
      proxyType: "immutable_no_proxy",
      canMint: false,
      canPause: false,
      canBlacklist: false,
      canChangeFee: false,
      canWithdrawLiquidity: false,
      timelockDelayHours: 72,
    });
    assert.ok(renouncedRes.score >= 85, `Expected renounced score >= 85, got ${renouncedRes.score}`);
    assert.equal(renouncedRes.powerRating, "DECENTRALIZED_DEFENSIBLE");

    // Dictatorial centralized contract (EOA owner, unverified proxy, unlimited privileges)
    const dictatorRes = calculateVelmereGovernancePower({
      ownerType: "eoa_unilateral",
      proxyType: "unrestricted_custom_proxy",
      canMint: true,
      canPause: true,
      canBlacklist: true,
      canChangeFee: true,
      canWithdrawLiquidity: true,
    });
    assert.ok(dictatorRes.score <= 15, `Expected dictator score <= 15, got ${dictatorRes.score}`);
    assert.equal(dictatorRes.powerRating, "UNILATERAL_EXPLOIT_RISK");
  });

  it("[4/8] VOFS - Oracle Fragility Score", () => {
    // Robust decentralized oracle
    const robustRes = calculateVelmereOracleFragility({
      mechanism: "decentralized_aggregator_twap",
      heartbeatSeconds: 60,
      capitalCostToManipulate2PctUsd: 15_000_000,
      independentFeedsCount: 3,
    });
    assert.ok(robustRes.score <= 20, `Expected robust oracle score <= 20, got ${robustRes.score}`);
    assert.equal(robustRes.exploitabilityTier, "ROBUST_DEFENSIBLE");

    // Fragile spot DEX oracle (flash loan price manipulation risk)
    const fragileRes = calculateVelmereOracleFragility({
      mechanism: "dex_spot_reserves_direct",
      heartbeatSeconds: 3600,
      capitalCostToManipulate2PctUsd: 25_000,
      independentFeedsCount: 1,
    });
    assert.ok(fragileRes.score >= 70, `Expected fragile oracle score >= 70, got ${fragileRes.score}`);
    assert.equal(fragileRes.exploitabilityTier, "IMMEDIATE_FLASH_LOAN_RISK");
  });

  it("[5/8] VER - Exit Risk", () => {
    // Malicious honeypot contract
    const honeypotRes = calculateVelmereExitRisk({
      isHoneypot: true,
      buyTaxPct: 99,
      sellTaxPct: 99,
      tradingCooldown: true,
      canBlacklistUser: true,
      percentLiquidityLocked: 0,
      top10HoldersPercentExcludingPools: 90,
    });
    assert.equal(honeypotRes.score, 100);
    assert.equal(honeypotRes.exitTier, "HONEYPOT_LOCKUP");

    // Unrestricted liquid asset
    const liquidRes = calculateVelmereExitRisk({
      isHoneypot: false,
      buyTaxPct: 0,
      sellTaxPct: 0,
      tradingCooldown: false,
      canBlacklistUser: false,
      percentLiquidityLocked: 100,
      top10HoldersPercentExcludingPools: 10,
    });
    assert.ok(liquidRes.score <= 15, `Expected unrestricted exit risk <= 15, got ${liquidRes.score}`);
    assert.equal(liquidRes.exitTier, "UNRESTRICTED_LIQUID");
  });

  it("[6/8] VDCS - Data Confidence Score", () => {
    // Tripped circuit breaker
    const breakerRes = calculateVelmereDataConfidence({
      providerConsensusScore: 0,
      ageMs: 100,
      totalDataPoints: 10,
      signedReceiptsCount: 10,
      deterministicReplayVerified: true,
      circuitBreakerTripped: true,
    });
    assert.equal(breakerRes.score, 0);
    assert.equal(breakerRes.confidenceGrade, "UNTRUSTED_FAIL_CLOSED");

    // Fresh multi-provider consensus with cryptographic receipts
    const trustedRes = calculateVelmereDataConfidence({
      providerConsensusScore: 95,
      ageMs: 200,
      totalDataPoints: 10,
      signedReceiptsCount: 10,
      deterministicReplayVerified: true,
      circuitBreakerTripped: false,
    });
    assert.ok(trustedRes.score >= 88, `Expected trusted score >= 88, got ${trustedRes.score}`);
    assert.equal(trustedRes.confidenceGrade, "INSTITUTIONAL_DEFENSIBLE");
  });

  it("[7/8] VSCS - Systemic Correlation Score", () => {
    // Decoupled idiosyncratic asset (low correlation)
    const assetReturns = [0.02, -0.01, 0.03, -0.02, 0.01, 0.04, -0.01, 0.02];
    const benchmarkReturns = [-0.03, 0.04, -0.01, 0.02, -0.02, -0.01, 0.03, -0.02];
    const decoupled = calculateVelmereSystemicCorrelation({ assetReturns, benchmarkReturns });
    assert.ok(decoupled.pearsonCorrelation < 0.2, `Expected low correlation, got ${decoupled.pearsonCorrelation}`);
    assert.ok(decoupled.score >= 60);

    // Highly coupled contagion asset (identical moves)
    const coupledReturns = [0.05, -0.04, 0.03, -0.02, 0.06, -0.05];
    const marketMoves = [0.05, -0.04, 0.03, -0.02, 0.06, -0.05];
    const coupled = calculateVelmereSystemicCorrelation({
      assetReturns: coupledReturns,
      benchmarkReturns: marketMoves,
    });
    assert.ok(coupled.pearsonCorrelation > 0.95);
    assert.ok(coupled.score <= 25);
    assert.equal(coupled.correlationTier, "PURE_SYSTEMIC_CONTAGION");
  });

  it("[8/8] VLDS - Liquidity Drawdown Shock", () => {
    // Deep resilient book
    const deepBids = [
      { price: 100, quantity: 1000 },
      { price: 99, quantity: 1000 },
      { price: 98, quantity: 1000 },
      { price: 97, quantity: 1000 },
    ];
    const deepShock = calculateVelmereLiquidityDrawdownShock({
      bids: deepBids,
      cascadeOrderCount: 5,
      orderSizeUsd: 50_000,
      replenishmentRatePct: 10,
    });
    assert.ok(deepShock.score >= 70, `Expected resilient book score >= 70, got ${deepShock.score}`);
    assert.equal(deepShock.exhaustionStep, null);
    assert.ok(deepShock.cumulativeDrawdownPct < 5.0);

    // Fragile thin book collapsing on step 2
    const fragileBids = [
      { price: 100, quantity: 400 }, // $40k total
    ];
    const fragileShock = calculateVelmereLiquidityDrawdownShock({
      bids: fragileBids,
      cascadeOrderCount: 5,
      orderSizeUsd: 50_000,
      replenishmentRatePct: 5,
    });
    assert.ok(fragileShock.score <= 25, `Expected fragile shock score <= 25, got ${fragileShock.score}`);
    assert.equal(fragileShock.exhaustionStep, 1);
    assert.equal(fragileShock.shockTier, "FLASH_CRASH_COLLAPSE");
  });
});
