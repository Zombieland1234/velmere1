import assert from "node:assert/strict";
import { sanitizeTokenRiskInput, validateTokenRiskInput } from "@/lib/market-integrity/data-backbone";
import { analyzeTokenRisk } from "@/lib/market-integrity/risk-engine";

const valid = {
  symbol: " btc ",
  name: " Bitcoin ",
  assetClass: "crypto" as const,
  currentPrice: "67000",
  marketCap: "1300000000000",
  volume24h: 42_000_000_000,
  providerHealthScore: 99,
  sourceDivergenceBps: 12,
  freshnessSeconds: 30,
  freshnessState: "fresh" as const,
  consensusState: "aligned" as const,
  sparkline7d: ["65000", 66_000, 67_000],
  dataSources: [" CoinGecko "],
};

const parsed = validateTokenRiskInput(valid);
if (!parsed.ok) throw new Error(parsed.error);
assert.equal(parsed.ok, true);
assert.equal(parsed.data.symbol, "BTC");
assert.equal(parsed.data.name, "Bitcoin");
assert.equal(parsed.data.currentPrice, 67_000);
assert.deepEqual(parsed.data.sparkline7d, [65_000, 66_000, 67_000]);
assert.deepEqual(parsed.data.dataSources, ["CoinGecko"]);

const invalidCases: Array<[string, unknown]> = [
  ["unknown field", { symbol: "BTC", name: "Bitcoin", injectedLaneBypass: true }],
  ["unknown asset class", { symbol: "BTC", name: "Bitcoin", assetClass: "bond" }],
  ["blank symbol", { symbol: "   ", name: "Bitcoin" }],
  ["negative market cap", { symbol: "BTC", name: "Bitcoin", marketCap: -1 }],
  ["zero current price", { symbol: "BTC", name: "Bitcoin", currentPrice: 0 }],
  ["impossible loss", { symbol: "BTC", name: "Bitcoin", priceChange24h: -100.01 }],
  ["invalid provider health", { symbol: "BTC", name: "Bitcoin", providerHealthScore: 101 }],
  ["fractional holder count", { symbol: "BTC", name: "Bitcoin", holderCount: 1.5 }],
  ["mixed malformed sparkline", { symbol: "BTC", name: "Bitcoin", sparkline7d: [1, "bad", 2] }],
  ["non-finite value", { symbol: "BTC", name: "Bitcoin", marketCap: Number.POSITIVE_INFINITY }],
];

for (const [label, candidate] of invalidCases) {
  const snapshot = structuredClone(candidate);
  const result = validateTokenRiskInput(candidate);
  assert.equal(result.ok, false, `${label} must fail validation`);
  assert.deepEqual(candidate, snapshot, `${label} validation must not mutate input`);
  assert.throws(
    () => analyzeTokenRisk(candidate as Parameters<typeof analyzeTokenRisk>[0], "live"),
    /risk_engine_input_validation_failed/u,
    `${label} must never fall back to raw input`,
  );
}

const explicitlyMalformed = { symbol: "BTC", name: "Bitcoin", marketCap: "not-a-number" };
const sanitized = sanitizeTokenRiskInput(explicitlyMalformed);
assert.equal(sanitized.marketCap, "not-a-number", "invalid explicit values must remain visible to schema rejection");
assert.equal(validateTokenRiskInput(explicitlyMalformed).ok, false);

console.log(`PASS strict risk input boundary ${invalidCases.length} adversarial cases`);
console.log("PASS no raw-input fallback after validation failure");
console.log("PASS complete typed provider/freshness/consensus schema");
