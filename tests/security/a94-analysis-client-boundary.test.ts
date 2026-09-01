import assert from "node:assert/strict";
import {
  buildDeterministicVlmAnalysis,
  runVlmAnalysis,
  type VlmAnalysisAsset,
} from "../../lib/market-integrity/vlm-analysis.js";

const asset: VlmAnalysisAsset = {
  id: "btc",
  symbol: "BTC",
  name: "Bitcoin",
  priceLabel: "100.00",
  changeLabel: "+1.25%",
  changeTone: "up",
  riskLabel: "42",
  confidenceLabel: "74",
  sourceLabel: "Attached test snapshot",
  sourceTimeLabel: "2026-07-28T10:00:00.000Z",
  candles: [
    { timestamp: 1, close: 98, volume: 10 },
    { timestamp: 2, close: 100, volume: 12 },
  ],
};

await assert.rejects(
  runVlmAnalysis(asset, "pro", { locale: "pl" }),
  /paid_tier_requires_server_entitlement/,
);
await assert.rejects(
  runVlmAnalysis(asset, "advanced", { locale: "de" }),
  /paid_tier_requires_server_entitlement/,
);

const german = buildDeterministicVlmAnalysis(asset, "basic", "de");
assert.equal(german.tier, "basic");
assert.equal(german.signals.length, 10);
assert.ok(german.signals.some((signal) => signal.name === "Marktregime"));
assert.match(german.summary, /beigefügten Snapshot/);
assert.doesNotMatch(german.summary, /current market conditions/i);
assert.ok(german.signals.every((signal) => signal.evidence.every((entry) => !/evidence ledger/i.test(entry.source))));

const polish = buildDeterministicVlmAnalysis(asset, "basic", "pl");
assert.match(polish.summary, /dołączonego snapshotu/);
assert.ok(polish.signals.some((signal) => signal.name === "Jakość danych"));

const english = buildDeterministicVlmAnalysis(asset, "basic", "en");
assert.match(english.summary, /attached snapshot/);
assert.doesNotMatch(english.summary, /current market conditions/i);

console.log("A94 client analysis entitlement and PL/EN/DE behavior: PASS");
