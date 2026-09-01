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

const NOW_MS = Date.parse("2026-07-24T00:00:00.000Z");
const iso = (offsetMs = 0) => new Date(NOW_MS + offsetMs).toISOString();
const asset = (symbol, assetClass = "crypto") => ({ symbol, providerSymbol: symbol, assetClass });
const marketImpact = (symbol, evidenceStatus = "fixture_only", generatedAt = iso(-86_400_000)) => ({
  schemaVersion: "test",
  assetKey: symbol,
  generatedAt,
  evidenceStatus,
  referenceMidPrice: 1,
  venueCount: 1,
  providerFamilyCount: 1,
  representativeExecutions: [],
  missingEvidence: [],
  blockers: [],
  evidenceDigest: "a".repeat(64),
});
const whaleWatch = (symbol, evidenceStatus = "fixture_only", generatedAt = iso(-86_400_000)) => ({
  schemaVersion: "test",
  assetKey: symbol,
  generatedAt,
  evidenceStatus,
  advancedReady: false,
  providerFamilies: ["fixture"],
  flowWindows: [],
  alerts: [],
  missingEvidence: [],
  blockers: [],
  evidenceDigest: "b".repeat(64),
  available: true,
});
const payload = ({ symbol = "BTC", depth = "basic", surface = "shield", status = "fixture_only", generatedAt = iso(-86_400_000), liveClaimed = false } = {}) => ({
  ok: true,
  mode: "partial",
  depth,
  surface,
  assetKey: symbol,
  publication: { mode: "partial", evidenceState: status, liveClaimed, blockers: [] },
  marketImpact: marketImpact(symbol, status, generatedAt),
  ...(depth === "basic"
    ? { whaleWatch: { locked: true, requiredTier: "pro", available: false } }
    : { whaleWatch: whaleWatch(symbol, status, generatedAt) }),
});
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "x-velmere-market-intelligence-depth": body.depth ?? "basic" },
});
const rejectionMessage = async (promise) => promise.then(
  () => "resolved",
  (error) => error instanceof Error ? error.message : String(error),
);

const originalFetch = globalThis.fetch;
try {
  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
  let basicFetches = 0;
  let observedCacheMode = null;
  globalThis.fetch = (_url, init = {}) => {
    basicFetches += 1;
    observedCacheMode = init.cache ?? null;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(response(payload({ symbol: request.assetKey, depth: request.depth, surface: request.surface })));
  };
  const basicA = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  const basicB = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("basic_public_response_cache_hit", basicFetches === 1 && basicB.assetKey === "BTC", `basic fetches=${basicFetches}`);
  assert("transport_forces_no_store", observedCacheMode === "no-store", `cache mode=${observedCacheMode}`);
  assert("runtime_response_root_frozen", Object.isFrozen(basicA), "normalized runtime response must be immutable");
  assert("runtime_response_market_packet_frozen", Object.isFrozen(basicA.marketImpact) && Object.isFrozen(basicA.marketImpact?.representativeExecutions), "nested packet and arrays must be immutable");

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
  let proFetches = 0;
  globalThis.fetch = (_url, init = {}) => {
    proFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(response(payload({ symbol: request.assetKey, depth: "pro", surface: request.surface })));
  };
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  const proSnapshot = runtime.pass35A37RuntimeSnapshot();
  assert("positive_pro_response_not_cached", proFetches === 2, `pro fetches=${proFetches}`);
  assert("positive_pro_cache_lane_empty", proSnapshot.positiveCacheEntries === 0 && proSnapshot.cacheEntries === 0, JSON.stringify(proSnapshot));

  const temporalCases = [
    {
      name: "future_live_evidence",
      body: payload({ status: "verified_live", generatedAt: iso(runtime.MAX_RUNTIME_FUTURE_SKEW_MS + 1) }),
      expected: "market_intelligence_future_evidence_rejected",
    },
    {
      name: "stale_live_evidence",
      body: payload({ status: "verified_live", generatedAt: iso(-runtime.MAX_RUNTIME_VERIFIED_LIVE_AGE_MS - 1) }),
      expected: "market_intelligence_stale_live_evidence",
    },
    {
      name: "stale_staging_evidence",
      body: payload({ status: "verified_staging", generatedAt: iso(-runtime.MAX_RUNTIME_VERIFIED_STAGING_AGE_MS - 1) }),
      expected: "market_intelligence_stale_staging_evidence",
    },
    {
      name: "invalid_live_generated_at",
      body: payload({ status: "verified_live", generatedAt: "not-a-date" }),
      expected: "market_intelligence_invalid_generated_at",
    },
    {
      name: "live_claim_without_live_evidence",
      body: payload({ status: "fixture_only", liveClaimed: true }),
      expected: "market_intelligence_live_claim_without_live_evidence",
    },
  ];
  for (const testCase of temporalCases) {
    runtime.pass35A37ResetRuntimeForTests();
    runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
    globalThis.fetch = () => Promise.resolve(response(testCase.body));
    const message = await rejectionMessage(runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal));
    assert(`${testCase.name}_rejected`, message === testCase.expected, `${testCase.name} => ${message}`);
    assert(`${testCase.name}_not_cached`, runtime.pass35A37RuntimeSnapshot().cacheEntries === 0, `${testCase.name} entered cache`);
  }

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
  globalThis.fetch = () => Promise.resolve(response(payload({ status: "verified_live", generatedAt: iso(-60_000), liveClaimed: true })));
  const freshLive = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("fresh_live_evidence_accepted", freshLive.marketImpact?.evidenceStatus === "verified_live", "fresh live packet should pass temporal gate");
  assert("fresh_live_claim_accepted", freshLive.publication?.liveClaimed === true, "live claim is allowed only with fresh verified-live delivered evidence");

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
  globalThis.fetch = () => Promise.resolve(response(payload({ status: "verified_staging", generatedAt: iso(-30 * 60_000) })));
  const freshStaging = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("fresh_staging_evidence_accepted", freshStaging.marketImpact?.evidenceStatus === "verified_staging", "fresh staging packet should pass bounded staging window");

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({ nowMs: NOW_MS });
  globalThis.fetch = () => Promise.resolve(response(payload({ status: "fixture_only", generatedAt: new Date(0).toISOString() })));
  const historicalFixture = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("historical_fixture_remains_explicitly_accepted", historicalFixture.marketImpact?.evidenceStatus === "fixture_only", "fixture evidence may be historical but cannot become LIVE");

  const tabsSource = read("components/market-integrity/AssetIntelligenceTabs.tsx");
  const modalSource = read("components/market-integrity/AssetDetailModal.tsx");
  const runtimeSource = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
  assert("hidden_tab_runtime_listener_installed", tabsSource.includes('document.addEventListener("visibilitychange", syncVisibility)') && tabsSource.includes("pageVisible"), "Market/Whale requests must react to page visibility");
  assert("hidden_tab_runtime_request_suspended", tabsSource.includes("if (!pageVisible)") && tabsSource.includes("return () => controller.abort()"), "hidden tab must abort/suspend current runtime request");
  assert("analysis_progress_pauses_hidden", modalSource.includes('document.visibilityState === "hidden"') && modalSource.includes("window.clearInterval(interval)"), "analysis loader interval must stop in hidden tabs");
  assert("analysis_progress_catches_up_visible", modalSource.includes("tick();") && modalSource.includes('document.addEventListener("visibilitychange", syncVisibility)'), "analysis progress must catch up after returning visible");
  assert("whale_rail_background_inert", tabsSource.includes('element.setAttribute("inert", "")') && tabsSource.includes('element.setAttribute("aria-hidden", "true")'), "modal alert rail must inert and hide sibling content while open");
  assert("whale_rail_restores_attributes", tabsSource.includes('item.element.removeAttribute("inert")') && tabsSource.includes('item.element.removeAttribute("aria-hidden")'), "nested modal cleanup must restore previous accessibility state");
  assert("positive_pro_cache_policy_source_bound", runtimeSource.includes('depth === "basic" && response.ok') && runtimeSource.includes("Positive Pro payloads are account-entitled"), "paid response cache isolation must be explicit in source");
  assert("temporal_truth_boundary_precedes_cache", runtimeSource.indexOf("assertRuntimeTruthBoundary(normalizedValue)") < runtimeSource.indexOf("runtimeCachePolicy(response, value, depth)"), "temporal truth gate must run before cache insertion");
  assert("immutable_projection_precedes_cache", runtimeSource.indexOf("deepFreezeRuntimeValue(normalizedValue)") < runtimeSource.indexOf("runtimeCachePolicy(response, value, depth)"), "immutable projection must precede cache delivery");

  const snapshot = runtime.pass35A37RuntimeSnapshot();
  assert("temporal_budgets_exposed", snapshot.maxFutureSkewMs === runtime.MAX_RUNTIME_FUTURE_SKEW_MS && snapshot.maxVerifiedLiveAgeMs === runtime.MAX_RUNTIME_VERIFIED_LIVE_AGE_MS, JSON.stringify(snapshot));

  console.log(JSON.stringify({
    status: "PASS_A40_SESSION_TEMPORAL_VISIBILITY_HARDENING",
    checks: checks.length,
    passed: checks.filter((check) => check.passed).length,
    temporalBudgets: {
      futureSkewMs: runtime.MAX_RUNTIME_FUTURE_SKEW_MS,
      verifiedLiveAgeMs: runtime.MAX_RUNTIME_VERIFIED_LIVE_AGE_MS,
      verifiedStagingAgeMs: runtime.MAX_RUNTIME_VERIFIED_STAGING_AGE_MS,
    },
    cachePolicy: {
      basicPositiveCached: true,
      proPositiveCached: false,
      withheldShortCachePreserved: true,
    },
    browserRuntimeClaimed: false,
    exactRuntimeBuildClaimed: false,
    sellEnabled: false,
  }, null, 2));
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = originalFetch;
}
