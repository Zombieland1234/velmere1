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

const runtime = await import(
  pathToFileURL(path.join(ROOT, "components/market-integrity/asset-detail/chart-runtime.ts")).href
    + `?r28=${Date.now()}`
);
const modal = fs.readFileSync(path.join(ROOT, "components/market-integrity/AssetDetailModal.tsx"), "utf8");
const chartRuntime = fs.readFileSync(path.join(ROOT, "components/market-integrity/asset-detail/chart-runtime.ts"), "utf8");

const asset = {
  symbol: "SAP",
  providerSymbol: "SAP.DE",
  name: "SAP",
  assetClass: "stock",
  venue: "XETRA",
  assetClassLabel: "stock",
  exchangeLabel: "XETRA",
  priceLabel: "1 EUR",
  marketDataState: "partial_not_live",
};
const candles = (base) => Array.from({ length: 12 }, (_, index) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  open: base + index,
  high: base + index + 2,
  low: base + index - 1,
  close: base + index + 1,
  volume: 1_000 + index,
}));
const response = (base) => new Response(JSON.stringify({
  mode: "live_partial",
  freshness: "partial_not_live",
  source: "fixture",
  generatedAt: "2026-07-31T03:30:00.000Z",
  candles: candles(base),
}), { status: 200, headers: { "content-type": "application/json" } });

const previousFetch = globalThis.fetch;
runtime.resetAssetDetailChartRuntimeForTests();
let calls = 0;
let releaseFirst;
const firstNetwork = new Promise((resolve) => { releaseFirst = resolve; });
globalThis.fetch = async () => {
  calls += 1;
  if (calls === 1) return firstNetwork;
  return response(200);
};

try {
  const firstConsumer = new AbortController();
  const first = runtime.fetchAssetDetailChartRuntime({
    data: asset,
    timeframe: "15M",
    signal: firstConsumer.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  ok(calls === 1, "runtime.first-request-started", calls);

  firstConsumer.abort();
  const second = runtime.fetchAssetDetailChartRuntime({ data: asset, timeframe: "15M" });
  const secondValue = await second;
  ok(calls === 2, "runtime.reopen-starts-fresh-request", calls);
  ok(secondValue.candles[0]?.open === 200, "runtime.reopen-gets-fresh-response", secondValue.candles[0]);
  await assert.rejects(first, (error) => error instanceof DOMException && error.name === "AbortError");
  ok(true, "runtime.first-consumer-aborted");

  releaseFirst(response(100));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const cached = runtime.readAssetDetailChartRuntimeCache(asset, "15M");
  ok(cached?.candles[0]?.open === 200, "runtime.aborted-response-cannot-overwrite-cache", cached?.candles[0]);
  const diagnostics = runtime.assetDetailChartRuntimeDiagnostics();
  ok(diagnostics.requestsStarted === 2, "runtime.two-network-generations", diagnostics);
  ok(diagnostics.inflightEntries === 0, "runtime.no-orphan-inflight", diagnostics);
} finally {
  globalThis.fetch = previousFetch;
  runtime.resetAssetDetailChartRuntimeForTests();
}

ok(!modal.includes("const timer = window.setTimeout(() => {\n      setRemoteCandles({});"), "modal.no-deferred-identity-reset");
ok(modal.includes("Reset synchronously in effect order"), "modal.synchronous-reset-contract");
ok(modal.includes('setLoadingTimeframe(activeDetailTab === "overview" ? activeTimeframe : null)'), "modal.reset-keeps-active-timeframe");
ok(chartRuntime.includes("Remove an aborted orphan immediately"), "runtime.aborted-orphan-removal-contract");
ok(chartRuntime.includes("!existing.controller.signal.aborted"), "runtime.no-join-aborted-entry");
ok(chartRuntime.includes('if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError")'), "runtime.aborted-response-cache-guard");
ok(chartRuntime.includes("chartInflight.delete(key);\n    return;"), "runtime.immediate-inflight-delete");

console.log(JSON.stringify({
  status: "PASS_A102R28_CHART_ABORT_REOPEN_AND_CACHE_RESET_RACE_NO_PROMOTION",
  checks,
  passed: checks,
  failed: 0,
  rapidReopenFreshRequests: 1,
  abortedResponseCacheWrites: 0,
  deferredIdentityReset: false,
  realBrowserRows: 0,
  exactReleaseCredit: false,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  results,
}, null, 2));
