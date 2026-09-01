import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { TokenRiskResult } from "../../lib/market-integrity/risk-types.js";
import { buildVlmShieldInvestigator } from "../../lib/market-integrity/shield-investigator.js";

function laneById(investigator: ReturnType<typeof buildVlmShieldInvestigator>, id: string) {
  const lane = investigator.lanes.find((item) => item.id === id);
  assert.ok(lane, `lane ${id} missing`);
  return lane;
}

function fixture(args: {
  marketId: string;
  symbol: string;
  name: string;
  tokenAddress?: string;
  confidence?: number;
  metrics: TokenRiskResult["metrics"];
  signals?: TokenRiskResult["signals"];
}): TokenRiskResult {
  return {
    token: {
      marketId: args.marketId,
      symbol: args.symbol,
      name: args.name,
      tokenAddress: args.tokenAddress,
      assetClass: "crypto",
    },
    score: 20,
    confidence: args.confidence ?? 0.8,
    level: "low",
    badge: "Low Risk",
    signals: args.signals ?? [],
    metrics: args.metrics,
    dataQuality: "live",
    dataSources: ["verified-market-provider"],
    agentAssessments: [],
    scoreBreakdown: [],
    customerTruth: {} as TokenRiskResult["customerTruth"],
    generatedAt: "2026-08-11T12:00:00.000Z",
  } as TokenRiskResult;
}

// CoinGecko-like non-BTC market snapshot: price/supply/history are present, but
// no holder, DEX liquidity, contract-permission or vesting proof is attached.
const marketOnly = fixture({
  marketId: "sample-token",
  symbol: "SMP",
  name: "Sample Token",
  metrics: {
    currentPrice: 1.25,
    marketCap: 125_000_000,
    fdv: 250_000_000,
    fdvToMarketCapRatio: 2,
    volume24h: 9_000_000,
    volumeToMarketCapRatio: 0.072,
    priceChange24h: 4.2,
    priceChange7d: 12.4,
    circulatingSupply: 100_000_000,
    totalSupply: 200_000_000,
    maxSupply: 200_000_000,
  },
});
const marketOnlyInvestigator = buildVlmShieldInvestigator(marketOnly);

assert.equal(laneById(marketOnlyInvestigator, "unlock").score, null, "missing vesting source must not mint a +38 risk score");
assert.equal(laneById(marketOnlyInvestigator, "unlock").status, "unknown");
assert.equal(laneById(marketOnlyInvestigator, "liquidity").score, null, "missing DEX/order-book evidence must not mint a liquidity score");
assert.equal(laneById(marketOnlyInvestigator, "insider").score, null, "missing holder evidence must not mint an insider score");
assert.equal(laneById(marketOnlyInvestigator, "contract").score, null, "missing contract verification must not mint a contract score");
assert.equal(marketOnlyInvestigator.overallRisk, null, "combined six-lane risk must be withheld when core lanes are unscored");
assert.ok(marketOnlyInvestigator.evidenceGapScore > 0);
assert.match(marketOnlyInvestigator.quickVerdict, /score withheld/i);
assert.doesNotMatch(marketOnlyInvestigator.systemPrompt, /Missing transparency is a red flag, not neutral/);
assert.match(marketOnlyInvestigator.systemPrompt, /never convert absence alone into a numeric adverse finding/i);

// Adding a genuinely adverse holder measurement should change only the
// evidence-backed holder lane; absence and adverse evidence remain distinct.
const holderBound = fixture({
  marketId: "sample-token",
  symbol: "SMP",
  name: "Sample Token",
  metrics: {
    ...marketOnly.metrics,
    top10HolderPercent: 72,
    holderCount: 12_000,
  },
});
const holderBoundInvestigator = buildVlmShieldInvestigator(holderBound);
assert.notEqual(laneById(holderBoundInvestigator, "insider").score, null);
assert.ok((laneById(holderBoundInvestigator, "insider").score ?? 0) >= 44);
assert.equal(laneById(holderBoundInvestigator, "liquidity").score, null);
assert.equal(holderBoundInvestigator.overallRisk, null, "one newly verified lane cannot manufacture a complete verdict");

// BTC has no issuer vesting/token-owner contract lane, so those two structural
// lanes can be scored as not-applicable/zero. If current supply, liquidity,
// holder and social inputs are all present, an overall observed score may exist.
const btcRich = fixture({
  marketId: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  metrics: {
    currentPrice: 100_000,
    marketCap: 2_000_000_000_000,
    fdv: 2_100_000_000_000,
    fdvToMarketCapRatio: 1.05,
    liquidityUsd: 40_000_000_000,
    liquidityToMarketCapPercent: 2,
    volume24h: 50_000_000_000,
    volumeToLiquidityRatio: 1.25,
    volumeToMarketCapRatio: 0.025,
    priceChange24h: 2.1,
    priceChange7d: 8.4,
    circulatingSupply: 19_800_000,
    totalSupply: 21_000_000,
    maxSupply: 21_000_000,
    top10HolderPercent: 11,
    holderCount: 1_000_000,
    simulatedSlippage10k: 0.01,
  },
});
const btcInvestigator = buildVlmShieldInvestigator(btcRich);
assert.equal(laneById(btcInvestigator, "unlock").score, 0);
assert.equal(laneById(btcInvestigator, "contract").score, 0);
assert.notEqual(btcInvestigator.overallRisk, null, "fully scorable BTC core should retain an observed numeric score");

const client = readFileSync("components/market-integrity/ShieldMapCommandClient.tsx", "utf8");
assert.doesNotMatch(client, /aria-label="Shield Map live search status"/);
assert.match(client, /aria-label="Shield Map search status"/);
assert.match(client, /marketData: "verified" \| "unknown"/);
assert.match(client, /overallRisk: number \| null/);
assert.match(client, /Withheld · evidence gaps/);

console.log("A102 Shield Map input sufficiency / missing-evidence separation regression: PASS");
