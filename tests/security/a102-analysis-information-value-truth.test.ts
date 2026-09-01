import assert from "node:assert/strict";
import {
  buildDeterministicVlmAnalysis,
  runVlmAnalysis,
  type AnalysisSignal,
  type VlmAnalysisAsset,
} from "../../lib/market-integrity/vlm-analysis.js";

function signal(result: ReturnType<typeof buildDeterministicVlmAnalysis>, id: string): AnalysisSignal {
  const found = result.signals.find((item) => item.id === id);
  assert.ok(found, `missing signal: ${id}`);
  return found;
}

const rising: VlmAnalysisAsset = {
  id: "method-truth",
  symbol: "MTH",
  name: "Method Truth Asset",
  priceLabel: "107",
  changeLabel: "+7.00%",
  changeTone: "up",
  sourceLabel: "Attached methodology fixture",
  sourceTimeLabel: "2026-08-11T12:00:00.000Z",
  riskLabel: "41",
  candles: [
    { timestamp: 1, close: 100, volume: 100 },
    { timestamp: 2, close: 101, volume: 100 },
    { timestamp: 3, close: 102, volume: 100 },
    { timestamp: 4, close: 103, volume: 100 },
    { timestamp: 5, close: 104, volume: 100 },
    { timestamp: 6, close: 105, volume: 100 },
    { timestamp: 7, close: 106, volume: 100 },
    { timestamp: 8, close: 107, volume: 100 },
  ],
};

const volatile: VlmAnalysisAsset = {
  ...rising,
  candles: [
    { timestamp: 1, close: 100, volume: 100 },
    { timestamp: 2, close: 120, volume: 100 },
    { timestamp: 3, close: 80, volume: 100 },
    { timestamp: 4, close: 130, volume: 100 },
    { timestamp: 5, close: 70, volume: 100 },
    { timestamp: 6, close: 140, volume: 100 },
    { timestamp: 7, close: 60, volume: 100 },
    { timestamp: 8, close: 150, volume: 100 },
  ],
};

const volumeShock: VlmAnalysisAsset = {
  ...rising,
  candles: rising.candles?.map((item, index) => ({
    ...item,
    volume: index >= 5 ? [1000, 1200, 1500][index - 5] : 100,
  })),
};

const risingResult = buildDeterministicVlmAnalysis(rising, "basic", "en");
const volatileResult = buildDeterministicVlmAnalysis(volatile, "basic", "en");
const volumeShockResult = buildDeterministicVlmAnalysis(volumeShock, "basic", "en");

// Same input remains byte-for-byte semantic deterministic.
assert.deepEqual(
  risingResult,
  buildDeterministicVlmAnalysis(rising, "basic", "en"),
  "same attached snapshot must return the same analysis",
);

// Relevant input perturbations must affect relevant DERIVED outputs.
assert.notEqual(signal(risingResult, "trend").value, signal(volatileResult, "trend").value);
assert.notEqual(signal(risingResult, "volatility").value, signal(volatileResult, "volatility").value);
assert.notEqual(signal(risingResult, "market-regime").value, signal(volatileResult, "market-regime").value);
assert.notEqual(signal(risingResult, "price-structure").value, signal(volatileResult, "price-structure").value);
assert.notEqual(signal(risingResult, "volume").value, signal(volumeShockResult, "volume").value);

// Inputs that do not exist in VlmAnalysisAsset must not be invented from symbol/name hashes.
for (const id of ["liquidity", "buy-sell-pressure", "relative-strength"] as const) {
  const item = signal(risingResult, id);
  assert.equal(item.provenanceState, "UNAVAILABLE", `${id} must fail closed without its required input`);
  assert.equal(item.score, null, `${id} must not expose a pseudo-score`);
  assert.equal(item.evidence.length, 0, `${id} must not expose synthetic evidence`);
}

// Every DERIVED signal exposes the exact fields/basis used to produce it.
for (const item of risingResult.signals.filter((entry) => entry.provenanceState === "DERIVED")) {
  assert.ok(item.inputFields.length > 0, `${item.id} must enumerate its input fields`);
  assert.ok(item.derivation.trim().length > 20, `${item.id} must explain its derivation`);
}

// No provider label means no claimed provider source and no invented source count.
const noSource = buildDeterministicVlmAnalysis({ ...rising, sourceLabel: null }, "basic", "en");
assert.equal(noSource.sourceCount, 0);
assert.ok(noSource.signals.flatMap((item) => item.evidence).every((entry) => !/VLM market data spine/i.test(entry.source)));
assert.ok(noSource.signals.flatMap((item) => item.evidence).every((entry) => !/VLM market data spine/i.test(entry.note)));
assert.equal(noSource.confidence, null, "input coverage must not be relabeled as analysis confidence");

// Thin snapshots stay honest: missing candle-dependent fields remain unavailable.
const thin = buildDeterministicVlmAnalysis({
  symbol: "THIN",
  name: "Thin Snapshot",
  priceLabel: "101",
  changeLabel: "+1%",
  candles: [
    { timestamp: 1, close: 100 },
    { timestamp: 2, close: 101 },
  ],
}, "basic", "en");
assert.equal(signal(thin, "volatility").provenanceState, "UNAVAILABLE");
assert.equal(signal(thin, "momentum").provenanceState, "UNAVAILABLE");
assert.equal(signal(thin, "volume").provenanceState, "UNAVAILABLE");
assert.equal(signal(thin, "liquidity").provenanceState, "UNAVAILABLE");
assert.equal(signal(thin, "buy-sell-pressure").provenanceState, "UNAVAILABLE");
assert.equal(signal(thin, "relative-strength").provenanceState, "UNAVAILABLE");
assert.match(thin.summary, /UNAVAILABLE/);

// Current reachable client boundary remains Basic-only; paid tiers are not credited from scaffolding.
await assert.rejects(runVlmAnalysis(rising, "pro", { locale: "en" }), /paid_tier_requires_server_entitlement/);
await assert.rejects(runVlmAnalysis(rising, "advanced", { locale: "en" }), /paid_tier_requires_server_entitlement/);

console.log("A102 analysis information-value derivation truth: PASS");
