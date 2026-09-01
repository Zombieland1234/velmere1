import assert from "node:assert/strict";
import { resolveLensPaidScope } from "../../lib/search/lens-paid-scope.js";

const resolved = resolveLensPaidScope({
  canonicalAssetId: "asset:btc",
  canonicalSymbol: "btc",
  assertedAssetId: "asset:btc",
  assertedSymbol: "BTC",
});
assert.deepEqual(resolved, { ok: true, assetId: "asset:btc", symbol: "BTC" });
console.log("PASS11 offline TS loader: PASS");
