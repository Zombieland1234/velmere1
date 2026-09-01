import assert from "node:assert/strict";
import { resolveLensPaidScope } from "../../lib/search/lens-paid-scope.js";

const canonical = { canonicalAssetId: "result-bitcoin-001", canonicalSymbol: "BTC" };

assert.deepEqual(resolveLensPaidScope(canonical), {
  ok: true,
  assetId: "result-bitcoin-001",
  symbol: "BTC",
});
assert.deepEqual(resolveLensPaidScope({
  ...canonical,
  assertedAssetId: "result-bitcoin-001",
  assertedSymbol: "btc",
}), {
  ok: true,
  assetId: "result-bitcoin-001",
  symbol: "BTC",
});

const wrongAsset = resolveLensPaidScope({
  ...canonical,
  assertedAssetId: "result-ethereum-001",
  assertedSymbol: "BTC",
});
assert.equal(wrongAsset.ok, false);
if (!wrongAsset.ok) {
  assert.equal(wrongAsset.error, "paid_asset_scope_mismatch");
  assert.deepEqual(wrongAsset.conflicts, ["asset_id"]);
}

const wrongSymbol = resolveLensPaidScope({
  ...canonical,
  assertedAssetId: "result-bitcoin-001",
  assertedSymbol: "ETH",
});
assert.equal(wrongSymbol.ok, false);
if (!wrongSymbol.ok) assert.deepEqual(wrongSymbol.conflicts, ["symbol"]);

const bothWrong = resolveLensPaidScope({
  ...canonical,
  assertedAssetId: "result-ethereum-001",
  assertedSymbol: "ETH",
});
assert.equal(bothWrong.ok, false);
if (!bothWrong.ok) assert.deepEqual(bothWrong.conflicts, ["asset_id", "symbol"]);

assert.deepEqual(resolveLensPaidScope({
  canonicalAssetId: " ",
  canonicalSymbol: "BTC",
}), {
  ok: false,
  error: "canonical_paid_scope_invalid",
  conflicts: [],
});

console.log("PASS Lens paid entitlement scope is bound to the immutable server-frozen report");
console.log("PASS client asset/symbol headers can assert equality but cannot override canonical identity");
