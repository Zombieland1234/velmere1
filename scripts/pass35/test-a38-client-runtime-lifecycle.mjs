#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const runtime = await import(new URL("../../components/market-integrity/asset-detail/market-intelligence-client-runtime.ts", import.meta.url));
const checks = [];
const assert = (name, condition, detail) => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const asset = (symbol, assetClass = "crypto", providerSymbol = symbol) => ({ symbol, providerSymbol, assetClass });
const contribution = (index = 0) => ({
  venueId: `venue-${index}`,
  providerFamily: `provider-${index}`,
  baseQuantity: 1,
  quoteNotional: 10_000,
  contributionPercent: 50,
});
const execution = (index = 0) => ({
  side: index % 2 ? "buy" : "sell",
  requestedNotionalUsd: 10_000 + index,
  referenceMidPrice: 1,
  requestedBaseQuantity: 1,
  filledBaseQuantity: 1,
  grossQuoteNotionalUsd: 10_000,
  feeUsd: 1,
  netQuoteNotionalUsd: 9_999,
  fillRatio: 1,
  unfilledNotionalUsd: 0,
  vwap: 1,
  impactBps: 2,
  worstPrice: 1,
  venueContributions: [contribution(index)],
});
const marketPayload = (symbol = "BTC") => ({
  ok: true,
  mode: "verified",
  depth: "basic",
  surface: "shield",
  assetKey: symbol,
  publication: { mode: "verified", evidenceState: "fixture_only", liveClaimed: false, blockers: [] },
  marketImpact: {
    schemaVersion: "test",
    assetKey: symbol,
    generatedAt: new Date(0).toISOString(),
    evidenceStatus: "fixture_only",
    referenceMidPrice: 1,
    venueCount: 1,
    providerFamilyCount: 1,
    representativeExecutions: [execution()],
    missingEvidence: [],
    blockers: [],
    evidenceDigest: "a".repeat(64),
  },
});
const whalePayload = (symbol = "BTC") => ({
  ...marketPayload(symbol),
  depth: "pro",
  whaleWatch: {
    schemaVersion: "test",
    assetKey: symbol,
    generatedAt: new Date(0).toISOString(),
    evidenceStatus: "fixture_only",
    advancedReady: false,
    providerFamilies: ["fixture-provider"],
    holderCount: 10,
    transferCount: 4,
    holderCoveragePercent: 90,
    verifiedLabelCoveragePercent: 60,
    clusterCoveragePercent: 50,
    rawConcentration: { top1Percent: 10, top5Percent: 25, top10Percent: 40, hhi: 0.1, gini: 0.2 },
    adjustedConcentration: { top1Percent: 8, top5Percent: 20, top10Percent: 35, hhi: 0.08, gini: 0.18 },
    flowWindows: [
      { window: "24h", eventCount: 1, exchangeInflowUsd: 1, exchangeOutflowUsd: 2, netExchangeFlowUsd: -1, treasuryToExchangeUsd: 0, treasuryDistributionUsd: 0, bridgeFlowUsd: 0, liquidityAddedUsd: 0, liquidityRemovedUsd: 0, mintedUsd: 0, burnedUsd: 0, whaleTransferUsd: 1 },
    ],
    alerts: [{ id: "alert-1", severity: "watch", confidencePercent: 70, title: "Fixture alert", evidence: ["fixture"] }],
    missingEvidence: [],
    blockers: [],
    evidenceDigest: "b".repeat(64),
    available: true,
  },
});
const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
  status: init.status ?? 200,
  headers: { "content-type": "application/json", ...(init.headers ?? {}) },
});

const originalFetch = globalThis.fetch;
try {
  runtime.pass35A37ResetRuntimeForTests();

  const collisionKeys = [
    runtime.runtimeKey(asset("A:B", "crypto", "A:B"), "en", "basic"),
    runtime.runtimeKey(asset("A", "crypto", "A"), "en", "basic"),
    runtime.runtimeKey(asset("A:B", "stock", "A:B"), "en", "basic"),
    runtime.runtimeKey(asset("A:B", "crypto", "A:B"), "de", "pro"),
  ];
  assert("structured_cache_key_no_delimiter_collision", new Set(collisionKeys).size === collisionKeys.length, "structured identities must remain unique even when provider symbols contain delimiters");
  assert("structured_cache_key_parseable", collisionKeys.every((key) => Array.isArray(JSON.parse(key))), "cache identities must remain machine-parseable arrays");

  let capacityFetches = 0;
  globalThis.fetch = (_url, init = {}) => {
    capacityFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(jsonResponse(marketPayload(request.assetKey || "UNKNOWN")));
  };
  for (let index = 0; index < runtime.MAX_RUNTIME_CACHE_ENTRIES; index += 1) {
    await runtime.fetchRuntime(asset(`CAP-${index}`), "en", "basic", new AbortController().signal);
  }
  assert("cache_reaches_exact_capacity", runtime.pass35A37RuntimeSnapshot().cacheEntries === runtime.MAX_RUNTIME_CACHE_ENTRIES, "cache must be able to hold the declared full denominator");
  await runtime.fetchRuntime(asset("CAP-0"), "en", "basic", new AbortController().signal);
  assert("full_cache_hit_does_not_evict_before_lookup", capacityFetches === runtime.MAX_RUNTIME_CACHE_ENTRIES, `oldest cache hit unexpectedly triggered fetch ${capacityFetches}`);
  assert("full_cache_hit_preserves_capacity", runtime.pass35A37RuntimeSnapshot().cacheEntries === runtime.MAX_RUNTIME_CACHE_ENTRIES, "full cache hit must preserve all 64 entries");

  runtime.pass35A37ResetRuntimeForTests();
  let lifecycleFetches = 0;
  let lifecycleAborts = 0;
  globalThis.fetch = (_url, init = {}) => {
    lifecycleFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(jsonResponse(request.depth === "pro" ? whalePayload(request.assetKey) : marketPayload(request.assetKey))), 2);
      init.signal?.addEventListener("abort", () => {
        lifecycleAborts += 1;
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  };

  for (let index = 0; index < 100; index += 1) {
    const currentAsset = asset(`OPEN-${index}`);
    const closing = new AbortController();
    const closedPromise = runtime.fetchRuntime(currentAsset, "en", "basic", closing.signal);
    await Promise.resolve();
    closing.abort();
    await closedPromise.catch((error) => {
      if (error?.name !== "AbortError") throw error;
    });
    const reopened = new AbortController();
    const value = await runtime.fetchRuntime(currentAsset, "en", "basic", reopened.signal);
    assert(`reopen_cycle_${index}`, value.marketImpact?.assetKey === currentAsset.providerSymbol, `cycle ${index} reopened with wrong asset payload`);
  }
  const openCloseSnapshot = runtime.pass35A37RuntimeSnapshot();
  assert("hundred_open_close_inflight_zero", openCloseSnapshot.inflightEntries === 0 && openCloseSnapshot.inflightConsumers === 0, "100 close/reopen cycles must leave no inflight requests or consumers");
  assert("hundred_open_close_cache_bounded", openCloseSnapshot.cacheEntries <= runtime.MAX_RUNTIME_CACHE_ENTRIES, `cache grew to ${openCloseSnapshot.cacheEntries}`);
  assert("hundred_open_close_transport_aborted", lifecycleAborts >= 100, `expected at least 100 transport aborts, received ${lifecycleAborts}`);

  runtime.pass35A37ResetRuntimeForTests();
  let tabSwitchFetches = 0;
  globalThis.fetch = (_url, init = {}) => {
    tabSwitchFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(jsonResponse(request.depth === "pro" ? whalePayload(request.assetKey) : marketPayload(request.assetKey))), 2);
      init.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  };
  for (let index = 0; index < 100; index += 1) {
    const currentAsset = asset(`TAB-${index}`);
    const marketController = new AbortController();
    const whaleController = new AbortController();
    const marketPromise = runtime.fetchRuntime(currentAsset, "en", "basic", marketController.signal);
    const whalePromise = runtime.fetchRuntime(currentAsset, "en", "pro", whaleController.signal);
    marketController.abort();
    const [marketResult, whaleResult] = await Promise.allSettled([marketPromise, whalePromise]);
    assert(`tab_switch_market_abort_${index}`, marketResult.status === "rejected" && marketResult.reason?.name === "AbortError", `cycle ${index} market tab did not abort cleanly`);
    assert(`tab_switch_whale_survives_${index}`, whaleResult.status === "fulfilled" && whaleResult.value.whaleWatch?.assetKey === currentAsset.providerSymbol, `cycle ${index} whale tab did not survive independent market abort`);
  }
  const tabSnapshot = runtime.pass35A37RuntimeSnapshot();
  assert("hundred_tab_switch_inflight_zero", tabSnapshot.inflightEntries === 0 && tabSnapshot.inflightConsumers === 0, "100 tab switches must leave no inflight requests or consumers");
  assert("hundred_tab_switch_cache_bounded", tabSnapshot.cacheEntries <= runtime.MAX_RUNTIME_CACHE_ENTRIES, `tab switch cache grew to ${tabSnapshot.cacheEntries}`);
  assert("hundred_tab_switch_exercised", tabSwitchFetches >= 200, `expected independent basic/pro transports for 100 unique assets, received ${tabSwitchFetches}`);

  const hostileExecutions = Array.from({ length: 100 }, (_, index) => ({
    ...execution(index),
    fillRatio: index === 0 ? 9 : 1,
    venueContributions: Array.from({ length: 50 }, (_, venueIndex) => contribution(venueIndex)),
  }));
  const hostileAlerts = Array.from({ length: 100 }, (_, index) => ({
    id: `alert-${index}`,
    severity: index === 0 ? "critical" : "watch",
    confidencePercent: index === 0 ? 900 : 50,
    title: `Alert ${index} ${"x".repeat(400)}`,
    evidence: Array.from({ length: 20 }, (_, evidenceIndex) => `evidence-${evidenceIndex}-${"y".repeat(400)}`),
  }));
  const hostile = runtime.pass35A38NormalizeRuntimeResponseForTests({
    ok: true,
    mode: "verified",
    publication: { liveClaimed: true, blockers: Array.from({ length: 100 }, (_, index) => `blocker-${index}`) },
    marketImpact: {
      ...marketPayload("HOSTILE").marketImpact,
      representativeExecutions: hostileExecutions,
      blockers: Array.from({ length: 100 }, (_, index) => `market-blocker-${index}`),
    },
    whaleWatch: {
      ...whalePayload("HOSTILE").whaleWatch,
      providerFamilies: Array.from({ length: 50 }, (_, index) => `provider-${index}`),
      holderCoveragePercent: 900,
      flowWindows: [
        ...Array.from({ length: 10 }, () => whalePayload("HOSTILE").whaleWatch.flowWindows[0]),
        { ...whalePayload("HOSTILE").whaleWatch.flowWindows[0], window: "7d" },
        { ...whalePayload("HOSTILE").whaleWatch.flowWindows[0], window: "30d" },
        { ...whalePayload("HOSTILE").whaleWatch.flowWindows[0], window: "invalid" },
      ],
      alerts: hostileAlerts,
      missingEvidence: Array.from({ length: 100 }, (_, index) => `missing-${index}`),
    },
  });
  assert("payload_execution_render_budget", hostile.marketImpact?.representativeExecutions.length === runtime.MAX_RUNTIME_MARKET_EXECUTIONS, "market execution list must be capped before React rendering");
  assert("payload_contribution_render_budget", hostile.marketImpact?.representativeExecutions.every((row) => row.venueContributions.length <= runtime.MAX_RUNTIME_VENUE_CONTRIBUTIONS), "venue contribution lists must be capped per execution");
  assert("payload_alert_render_budget", hostile.whaleWatch?.alerts?.length === runtime.MAX_RUNTIME_WHALE_ALERTS, "Whale alert list must be capped before rendering");
  assert("payload_alert_evidence_budget", hostile.whaleWatch?.alerts?.every((row) => row.evidence.length <= runtime.MAX_RUNTIME_ALERT_EVIDENCE), "alert evidence list must be capped");
  assert("payload_provider_budget", hostile.whaleWatch?.providerFamilies?.length === runtime.MAX_RUNTIME_PROVIDER_FAMILIES, "provider family list must be capped");
  assert("payload_evidence_budget", hostile.marketImpact?.blockers.length === runtime.MAX_RUNTIME_EVIDENCE_ITEMS && hostile.whaleWatch?.missingEvidence?.length === runtime.MAX_RUNTIME_EVIDENCE_ITEMS, "blocker and evidence lists must be capped");
  assert("payload_flow_dedup", hostile.whaleWatch?.flowWindows?.length === 3 && new Set(hostile.whaleWatch.flowWindows.map((row) => row.window)).size === 3, "flow windows must be recognized, deduplicated and capped to 24h/7d/30d");
  assert("payload_numeric_clamp", hostile.marketImpact?.representativeExecutions[0]?.fillRatio === 1 && hostile.whaleWatch?.holderCoveragePercent === 100 && hostile.whaleWatch?.alerts?.[0]?.confidencePercent === 100, "unsafe numeric ranges must be clamped to UI-safe semantics");
  assert("payload_text_clamp", (hostile.whaleWatch?.alerts?.[0]?.title.length ?? 0) <= runtime.MAX_RUNTIME_TEXT_LENGTH && (hostile.whaleWatch?.alerts?.[0]?.evidence[0]?.length ?? 0) <= runtime.MAX_RUNTIME_TEXT_LENGTH, "untrusted strings must be bounded before rendering");
  assert("payload_live_claim_not_promoted", hostile.publication?.liveClaimed === true && hostile.mode === "verified", "normalizer may preserve server truth but must not create additional LIVE eligibility fields");

  const tabsSource = read("components/market-integrity/AssetIntelligenceTabs.tsx");
  const runtimeSource = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
  assert("asset_switch_clears_stale_payload", tabsSource.includes("identityChanged ? null : current.value") && tabsSource.includes("previousIdentityRef"), "new asset identity must not render stale previous-asset analysis during loading");
  const whaleOverlayResetByEffect = tabsSource.includes("setSelectedAlert(null)") && tabsSource.includes("setConcentrationOpen(false)") && tabsSource.includes("[assetIdentity]");
  const whaleOverlayResetByIdentityRemount = tabsSource.includes('const assetIdentity = runtimeKey(props.asset, props.locale, "pro")') && tabsSource.includes("<WhaleWatchTabContent key={assetIdentity}");
  assert("whale_overlay_resets_on_asset_switch", whaleOverlayResetByEffect || whaleOverlayResetByIdentityRemount, "Whale overlays must close through an identity-bound effect or a full identity-keyed remount when the selected instrument changes");
  assert("whale_rail_focus_trap", tabsSource.includes("trapTabWithin(event, alertRailRef.current)") && tabsSource.includes('aria-modal="true"'), "Whale alert dialog must trap keyboard focus while open");
  assert("runtime_payload_normalizer_active", runtimeSource.includes("normalizeRuntimeResponse(JSON.parse(text)") && runtimeSource.includes("MAX_RUNTIME_WHALE_ALERTS"), "bounded schema projection must run before cache and UI delivery");
  assert("runtime_cache_capacity_reservation", runtimeSource.includes("pruneRuntimeCache(Date.now(), 1)") && runtimeSource.includes("runtimeCache.size > targetSize"), "cache eviction must reserve capacity only for insertion, not before lookups");

  runtime.pass35A37ResetRuntimeForTests();
  global.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  for (let index = 0; index < 500; index += 1) {
    runtime.pass35A38NormalizeRuntimeResponseForTests(hostile);
  }
  global.gc?.();
  const heapAfter = process.memoryUsage().heapUsed;
  const heapDeltaBytes = Math.max(0, heapAfter - heapBefore);
  assert("node_heap_surrogate_bounded", heapDeltaBytes < 32 * 1024 * 1024, `normalization heap surrogate grew by ${heapDeltaBytes} bytes`);

  console.log(JSON.stringify({
    status: "PASS_A38_CLIENT_RUNTIME_LIFECYCLE_AND_PAYLOAD_HARDENING",
    checks: checks.length,
    passed: checks.filter((check) => check.passed).length,
    lifecycleCases: {
      modalOpenCloseReopen: 100,
      tabSwitches: 100,
      payloadNormalizations: 500,
      cacheCapacity: runtime.MAX_RUNTIME_CACHE_ENTRIES,
    },
    runtimeBudgets: {
      responseBytes: runtime.MAX_RUNTIME_RESPONSE_BYTES,
      marketExecutions: runtime.MAX_RUNTIME_MARKET_EXECUTIONS,
      venueContributions: runtime.MAX_RUNTIME_VENUE_CONTRIBUTIONS,
      whaleAlerts: runtime.MAX_RUNTIME_WHALE_ALERTS,
      alertEvidence: runtime.MAX_RUNTIME_ALERT_EVIDENCE,
    },
    observed: {
      lifecycleFetches,
      lifecycleAborts,
      tabSwitchFetches,
      heapDeltaBytes,
    },
    browserHeapClaimed: false,
    exactRuntimeBuildBrowserClaimed: false,
    sellEnabled: false,
  }, null, 2));
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = originalFetch;
}
