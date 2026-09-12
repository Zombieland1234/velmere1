import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  REAL_MARKET_INSTRUMENT_MASTER,
  resolveRealMarketInstrumentMaster,
} from "../../lib/market-integrity/real-market-instrument-master";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 && args[outputIndex + 1]
  ? args[outputIndex + 1]
  : "/tmp/r11b/REAL_MARKET_IDENTITY.json";

const expected = new Map<string, string>([
  ["equity-us-aapl", "AAPL"],
  ["equity-us-msft", "MSFT"],
  ["equity-us-nvda", "NVDA"],
  ["equity-us-amzn", "AMZN"],
  ["equity-us-googl", "GOOGL"],
  ["equity-us-meta", "META"],
  ["equity-us-tsla", "TSLA"],
  ["equity-us-brk-b", "BRK.B"],
  ["equity-us-jpm", "JPM"],
  ["equity-us-v", "V"],
  ["etf-us-spy", "SPY"],
  ["etf-us-qqq", "QQQ"],
  ["future-cme-gc-front", "GC"],
  ["future-cme-si-front", "SI"],
  ["future-nymex-cl-front", "CL"],
  ["future-nymex-ng-front", "NG"],
  ["future-cme-6e-front", "6E"],
  ["future-cme-6j-front", "6J"],
  ["index-cboe-vix", "VIX"],
  ["etf-us-tlt", "TLT"],
]);

assert.equal(REAL_MARKET_INSTRUMENT_MASTER.length, 20, "real-market master denominator must remain exactly 20");
assert.deepEqual(
  [...REAL_MARKET_INSTRUMENT_MASTER.map((entry) => entry.identity.instrumentId)].sort(),
  [...expected.keys()].sort(),
  "master instrumentId universe changed without explicit denominator update",
);

const instrumentIds = new Set<string>();
const canonicalSymbols = new Set<string>();
const aliases = new Map<string, string>();
const aliasCollisions: Array<{ alias: string; first: string; second: string }> = [];
let checkedAliases = 0;

for (const entry of REAL_MARKET_INSTRUMENT_MASTER) {
  const id = entry.identity.instrumentId;
  assert.equal(expected.get(id), entry.identity.canonicalSymbol, `unexpected canonical symbol for ${id}`);
  assert.equal(instrumentIds.has(id), false, `duplicate instrumentId:${id}`);
  instrumentIds.add(id);

  const canonicalKey = entry.identity.canonicalSymbol.trim().toLowerCase();
  assert.equal(canonicalSymbols.has(canonicalKey), false, `duplicate canonicalSymbol:${entry.identity.canonicalSymbol}`);
  canonicalSymbols.add(canonicalKey);

  assert.equal(entry.identity.dataProvider, "UNVERIFIED_REPORT_INPUT", `master must not imply live/provider verification:${id}`);
  assert.equal(entry.identity.asOf, null, `master identity must not synthesize asOf:${id}`);
  assert.equal(entry.identity.freshnessSeconds, null, `master identity must not synthesize freshness:${id}`);

  const symbolInputs = new Set([...entry.legacySymbols, entry.identity.canonicalSymbol]);
  for (const rawAlias of symbolInputs) {
    const key = rawAlias.trim().toLowerCase();
    const prior = aliases.get(key);
    if (prior && prior !== id) aliasCollisions.push({ alias: rawAlias, first: prior, second: id });
    aliases.set(key, id);
    const resolved = resolveRealMarketInstrumentMaster({ symbol: rawAlias });
    assert.equal(resolved?.identity.instrumentId, id, `symbol alias resolved to wrong identity:${rawAlias}`);
    checkedAliases += 1;
  }

  for (const rawIdentifier of entry.legacyIdentifiers) {
    const key = `identifier:${rawIdentifier.trim().toLowerCase()}`;
    const prior = aliases.get(key);
    if (prior && prior !== id) aliasCollisions.push({ alias: rawIdentifier, first: prior, second: id });
    aliases.set(key, id);
    const resolved = resolveRealMarketInstrumentMaster({ identifier: rawIdentifier });
    assert.equal(resolved?.identity.instrumentId, id, `identifier alias resolved to wrong identity:${rawIdentifier}`);
    checkedAliases += 1;
  }
}

assert.deepEqual(aliasCollisions, [], "alias collision detected");

// These legacy symbols intentionally map to futures. The assertion makes that mapping explicit,
// preventing a future refactor from silently presenting spot FX/metals as the same instrument.
const explicitLegacyFutureAliases = new Map([
  ["XAU", "future-cme-gc-front"],
  ["XAG", "future-cme-si-front"],
  ["EURUSD", "future-cme-6e-front"],
  ["USDJPY", "future-cme-6j-front"],
]);
for (const [symbol, expectedId] of explicitLegacyFutureAliases) {
  const resolved = resolveRealMarketInstrumentMaster({ symbol });
  assert.equal(resolved?.identity.instrumentId, expectedId, `legacy future alias contract changed:${symbol}`);
  assert.equal(resolved?.identity.instrumentType, "future", `legacy alias must remain explicitly future:${symbol}`);
}

for (const ambiguous of ["gold", "silver", "sp500", "nasdaq", "volatility", "forex"]) {
  assert.equal(resolveRealMarketInstrumentMaster({ symbol: ambiguous }), null, `broad family alias must fail closed:${ambiguous}`);
}

const receipt = {
  schemaVersion: "velmere.r11.real-market-master-verification.v1",
  evidenceClass: "CURRENT_GIT_LOCAL_MASTER_VERIFICATION",
  denominator: REAL_MARKET_INSTRUMENT_MASTER.length,
  expectedDenominator: 20,
  uniqueInstrumentIds: instrumentIds.size,
  uniqueCanonicalSymbols: canonicalSymbols.size,
  checkedAliases,
  aliasCollisions,
  explicitLegacyFutureAliases: Object.fromEntries(explicitLegacyFutureAliases),
  externalProviderIdentityCredit: false,
  productionIdentityCredit: false,
  passed: true,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
