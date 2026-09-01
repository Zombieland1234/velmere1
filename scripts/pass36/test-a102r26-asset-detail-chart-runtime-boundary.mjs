#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
let checks = 0;
const results = [];
function ok(value, id, detail = null) {
  checks += 1;
  assert.ok(value, id);
  results.push({ id, passed: true, detail });
}
const text = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const moduleUrl = pathToFileURL(path.join(ROOT, "components/market-integrity/asset-detail/chart-runtime.ts")).href + `?r26=${Date.now()}`;
const runtime = await import(moduleUrl);

ok(runtime.ASSET_DETAIL_CHART_REFERENCE_TTL_MS === 300_000, "runtime.reference-ttl");
ok(runtime.ASSET_DETAIL_CHART_LIVE_TTL_MS === 12_000, "runtime.live-ttl");
ok(runtime.ASSET_DETAIL_CHART_CACHE_LIMIT === 96, "runtime.cache-limit");
ok(runtime.shouldAutoRefreshAssetDetailChart({ freshness: "live_verified" }) === true, "runtime.live-auto-refresh");
ok(runtime.shouldAutoRefreshAssetDetailChart({ freshness: "partial_not_live" }) === true, "runtime.partial-auto-refresh");
ok(runtime.shouldAutoRefreshAssetDetailChart({ freshness: "local_reference" }) === false, "runtime.reference-no-auto-refresh");
ok(runtime.shouldAutoRefreshAssetDetailChart({ freshness: "last_known_good" }) === false, "runtime.last-known-no-auto-refresh");

const previousFetch = globalThis.fetch;
let now = 1_000;
runtime.configureAssetDetailChartRuntimeForTests(() => now);
runtime.resetAssetDetailChartRuntimeForTests();
runtime.configureAssetDetailChartRuntimeForTests(() => now);

const asset = {
  symbol: "BTC",
  name: "Bitcoin",
  assetClass: "crypto",
  assetClassLabel: "crypto",
  exchangeLabel: "Shield",
  priceLabel: "$1",
  marketDataState: "local_reference",
};
const candles = Array.from({ length: 12 }, (_, index) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  open: 100 + index,
  high: 102 + index,
  low: 99 + index,
  close: 101 + index,
  volume: 1000 + index,
}));
let fetchCalls = 0;
let releaseFetch;
globalThis.fetch = async () => {
  fetchCalls += 1;
  await new Promise((resolve) => { releaseFetch = resolve; });
  return new Response(JSON.stringify({
    mode: "local_reference",
    freshness: "local_reference_not_live",
    source: "local-development-reference",
    generatedAt: "2026-07-31T00:00:00.000Z",
    candles,
  }), { status: 200, headers: { "content-type": "application/json" } });
};

try {
  const firstAbort = new AbortController();
  const secondAbort = new AbortController();
  const first = runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M", signal: firstAbort.signal });
  const second = runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M", signal: secondAbort.signal });
  await new Promise((resolve) => setTimeout(resolve, 0));
  ok(fetchCalls === 1, "runtime.parallel-dedup", fetchCalls);
  firstAbort.abort();
  releaseFetch();
  await assert.rejects(first, (error) => error instanceof DOMException && error.name === "AbortError");
  ok(true, "runtime.consumer-abort-isolated");
  const value = await second;
  ok(value.freshness === "local_reference", "runtime.reference-freshness", value.freshness);
  ok(value.liveVerified === false, "runtime.reference-not-live");
  ok(value.candles.length === 12, "runtime.reference-candles");

  const cached = await runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M" });
  ok(cached === value, "runtime.cache-value-identity");
  ok(fetchCalls === 1, "runtime.cache-hit-zero-network", fetchCalls);
  const snapshot = runtime.assetDetailChartRuntimeDiagnostics();
  ok(snapshot.inflightJoins === 1, "runtime.inflight-join-count", snapshot);
  ok(snapshot.cacheHits >= 1, "runtime.cache-hit-count", snapshot);

  now = 300_999;
  await runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M" });
  ok(fetchCalls === 1, "runtime.reference-cache-before-expiry", fetchCalls);

  now = 301_001;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({
      mode: "local_reference",
      freshness: "local_reference_not_live",
      source: "local-development-reference",
      generatedAt: "2026-07-31T00:00:00.000Z",
      candles,
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  await runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M" });
  ok(fetchCalls === 2, "runtime.reference-cache-expired", fetchCalls);
  runtime.invalidateAssetDetailChartRuntime(asset, "15M");
  ok(runtime.readAssetDetailChartRuntimeCache(asset, "15M") === null, "runtime.explicit-invalidate");
} finally {
  globalThis.fetch = previousFetch;
  runtime.resetAssetDetailChartRuntimeForTests();
}

const modal = text("components/market-integrity/AssetDetailModal.tsx");
const provider = text("components/market-integrity/asset-detail/chart-provider.ts");
const model = text("components/market-integrity/asset-detail/chart-model.ts");
const chartRuntime = text("components/market-integrity/asset-detail/chart-runtime.ts");
ok(modal.includes("fetchAssetDetailChartRuntime"), "static.shared-runtime-wired");
ok(modal.includes("readAssetDetailChartRuntimeCache"), "static.shared-cache-wired");
ok(modal.includes("shouldAutoRefreshAssetDetailChart"), "static.refresh-policy-wired");
ok(modal.includes("const chartInitialLoading = chartIsLoading && !chartHasCandles"), "static.initial-loading-separated");
ok(modal.includes("const chartRefreshing = chartIsLoading && chartHasCandles"), "static.refreshing-separated");
ok(modal.includes("{chartInitialLoading ? ("), "static.no-full-loader-on-refresh");
ok(modal.includes("remote?.freshness === \"local_reference\""), "static.reference-copy");
ok(!modal.includes("remote.mode === \"local_reference\""), "static.no-undeclared-remote-mode");
ok(!modal.includes("delete next[activeTimeframe];\n      return next;\n    });\n    setChartErrors"), "static.manual-refresh-keeps-candles");
ok(provider.includes('"local_reference"'), "static.provider-reference-mode");
ok(provider.includes('"local_reference_not_live"'), "static.provider-reference-freshness");
ok(model.includes('| "local_reference"'), "static.model-reference-freshness");
ok(chartRuntime.includes("entry.consumers === 0 && !entry.settled"), "static.last-consumer-abort");
ok(chartRuntime.includes("ASSET_DETAIL_CHART_CACHE_LIMIT = 96"), "static.bounded-cache");

console.log(JSON.stringify({
  status: "PASS_A102R26_ASSET_DETAIL_CHART_RUNTIME_NO_PROMOTION",
  checks,
  passed: checks,
  failed: 0,
  parallelNetworkRequests: 1,
  localReferenceAutoRefresh: false,
  backgroundRefreshFullChartReplacement: false,
  productionSyntheticCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  results,
}, null, 2));
