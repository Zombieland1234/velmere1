#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const runtime = await import(new URL("../../components/market-integrity/asset-detail/market-intelligence-client-runtime.ts", import.meta.url));
const checks = [];
const assert = (name, condition, detail) => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const asset = (symbol, assetClass = "crypto") => ({
  symbol,
  providerSymbol: symbol,
  name: symbol,
  assetClass,
});
const marketPayload = (symbol = "BTC") => ({
  ok: true,
  mode: "verified",
  depth: "basic",
  surface: "shield",
  assetKey: symbol,
  marketImpact: {
    schemaVersion: "test",
    assetKey: symbol,
    generatedAt: new Date(0).toISOString(),
    evidenceStatus: "fixture_only",
    referenceMidPrice: 1,
    venueCount: 1,
    providerFamilyCount: 1,
    representativeExecutions: [],
    missingEvidence: [],
    blockers: [],
    evidenceDigest: "a".repeat(64),
  },
});
const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
  status: init.status ?? 200,
  headers: { "content-type": "application/json", ...(init.headers ?? {}) },
});

const originalFetch = globalThis.fetch;
try {
  runtime.pass35A37ResetRuntimeForTests();
  let sharedFetchCount = 0;
  let sharedUnderlyingAborted = false;
  globalThis.fetch = (_url, init = {}) => {
    sharedFetchCount += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(jsonResponse(marketPayload())), 35);
      init.signal?.addEventListener("abort", () => {
        sharedUnderlyingAborted = true;
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  };

  const firstController = new AbortController();
  const secondController = new AbortController();
  const first = runtime.fetchRuntime(asset("BTC"), "en", "basic", firstController.signal);
  const second = runtime.fetchRuntime(asset("BTC"), "en", "basic", secondController.signal);
  await sleep(0);
  firstController.abort();
  const firstResult = await first.then(() => "resolved", (error) => error?.name ?? "rejected");
  const secondResult = await second;
  assert("shared_request_single_fetch", sharedFetchCount === 1, `expected one fetch, received ${sharedFetchCount}`);
  assert("single_consumer_abort_isolated", firstResult === "AbortError" && secondResult.ok === true, "one consumer abort must not reject the remaining consumer");
  assert("shared_transport_not_aborted_early", sharedUnderlyingAborted === false, "transport must remain active while another consumer is subscribed");
  assert("shared_inflight_released", runtime.pass35A37RuntimeSnapshot().inflightEntries === 0, "settled shared request must leave no inflight entry");

  const cached = await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("cache_reuses_verified_response", cached.ok === true && sharedFetchCount === 1, "fresh cached response must avoid a duplicate fetch");
  runtime.invalidateRuntimeCache(asset("BTC"), "en", "basic");
  await runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal);
  assert("retry_invalidation_forces_fetch", sharedFetchCount === 2, "explicit invalidation must force a fresh request");

  runtime.pass35A37ResetRuntimeForTests();
  let allConsumersTransportAborted = false;
  globalThis.fetch = (_url, init = {}) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(jsonResponse(marketPayload("ETH"))), 500);
    init.signal?.addEventListener("abort", () => {
      allConsumersTransportAborted = true;
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
  const allAbortA = new AbortController();
  const allAbortB = new AbortController();
  const allAbortPromiseA = runtime.fetchRuntime(asset("ETH"), "en", "basic", allAbortA.signal);
  const allAbortPromiseB = runtime.fetchRuntime(asset("ETH"), "en", "basic", allAbortB.signal);
  await sleep(0);
  allAbortA.abort();
  allAbortB.abort();
  await Promise.allSettled([allAbortPromiseA, allAbortPromiseB]);
  await sleep(0);
  assert("all_consumers_abort_transport", allConsumersTransportAborted, "transport must abort after the final consumer leaves");
  assert("all_abort_inflight_cleanup", runtime.pass35A37RuntimeSnapshot().inflightEntries === 0, "aborted request must be removed from inflight registry");

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = () => Promise.resolve(jsonResponse(marketPayload(), {
    headers: { "content-length": String(runtime.MAX_RUNTIME_RESPONSE_BYTES + 1) },
  }));
  const declaredOversize = await runtime.fetchRuntime(asset("OVERSIZE-H"), "en", "basic", new AbortController().signal)
    .then(() => "resolved", (error) => error?.message ?? "rejected");
  assert("declared_response_limit", declaredOversize === "market_intelligence_response_too_large", "oversized Content-Length must fail before JSON parsing");

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = () => {
    const chunk = new Uint8Array(300_000).fill(65);
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
  };
  const streamedOversize = await runtime.fetchRuntime(asset("OVERSIZE-S"), "en", "basic", new AbortController().signal)
    .then(() => "resolved", (error) => error?.message ?? "rejected");
  assert("streamed_response_limit", streamedOversize === "market_intelligence_response_too_large", "stream reader must cancel once the byte ceiling is crossed");

  runtime.pass35A37ResetRuntimeForTests();
  let boundedFetchCount = 0;
  globalThis.fetch = (_url, init = {}) => {
    boundedFetchCount += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(jsonResponse(marketPayload(request.assetKey || "UNKNOWN")));
  };
  for (let index = 0; index < 70; index += 1) {
    await runtime.fetchRuntime(asset(`ASSET-${index}`), "en", "basic", new AbortController().signal);
  }
  const boundedSnapshot = runtime.pass35A37RuntimeSnapshot();
  assert("cache_hard_limit", boundedSnapshot.cacheEntries <= runtime.MAX_RUNTIME_CACHE_ENTRIES, `cache size ${boundedSnapshot.cacheEntries} exceeds ${runtime.MAX_RUNTIME_CACHE_ENTRIES}`);
  assert("cache_denominator_exercised", boundedFetchCount === 70, `expected 70 unique fetches, received ${boundedFetchCount}`);

  const keyCrypto = runtime.runtimeKey(asset("SAME", "crypto"), "en", "basic");
  const keyEquity = runtime.runtimeKey(asset("SAME", "equity"), "en", "basic");
  const keyPro = runtime.runtimeKey(asset("SAME", "crypto"), "en", "pro");
  const keyPl = runtime.runtimeKey(asset("SAME", "crypto"), "pl", "basic");
  assert("runtime_key_identity", new Set([keyCrypto, keyEquity, keyPro, keyPl]).size === 4, "asset class, surface, tier and locale must remain distinct cache identities");

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = () => Promise.resolve(jsonResponse({ ok: false, mode: "withheld", error: "evidence_unavailable", depth: "pro", surface: "shield", assetKey: "WITHHELD" }, { status: 424 }));
  const withheld = await runtime.fetchRuntime(asset("WITHHELD"), "en", "pro", new AbortController().signal);
  assert("withheld_response_preserved", withheld.mode === "withheld" && withheld.error === "evidence_unavailable", "424 evidence state must remain a bounded value rather than a transport exception");

  const modal = read("components/market-integrity/AssetDetailModal.tsx");
  const neural = read("components/market-integrity/asset-detail/VlmNeuralBrainCanvas.tsx");
  const runtimeSource = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
  const tabs = read("components/market-integrity/AssetIntelligenceTabs.tsx");
  assert("neural_chunk_extracted", modal.includes('import("@/components/market-integrity/asset-detail/VlmNeuralBrainCanvas")') && !modal.includes("function VlmNeuralBrainCanvas"), "Neural canvas must be outside the initial AssetDetailModal source chunk");
  assert("neural_visibility_pause", neural.includes("IntersectionObserver") && neural.includes("visibilitychange") && neural.includes("isIntersecting"), "animation must pause offscreen and on hidden documents");
  assert("neural_motion_budget", neural.includes("prefers-reduced-motion") && neural.includes("STANDARD_FRAME_INTERVAL_MS") && neural.includes("CONSERVATIVE_FRAME_INTERVAL_MS"), "animation must honor reduced motion and frame budgets");
  assert("neural_gpu_budget", neural.includes("dprCap") && neural.includes("hardwareConcurrency") && neural.includes("CONSERVATIVE_NODE_COUNT"), "DPR and node count must adapt to constrained devices");
  assert("runtime_extracted_testable", tabs.includes("market-intelligence-client-runtime") && runtimeSource.includes("pass35A37RuntimeSnapshot"), "request/cache logic must live in an independently testable non-React module");
  assert("runtime_stream_bounded", runtimeSource.includes("response.body.getReader()") && runtimeSource.includes("reader.cancel") && runtimeSource.includes("MAX_RUNTIME_RESPONSE_BYTES"), "response parsing must enforce the byte ceiling while streaming");
  assert("runtime_abort_reference_counted", runtimeSource.includes("entry.consumers += 1") && runtimeSource.includes("entry.consumers === 0") && runtimeSource.includes("subscribeToRuntime"), "shared transport abort must be reference-counted");
  assert("runtime_lru_touch", runtimeSource.includes("runtimeCache.delete(key)") && runtimeSource.includes("runtimeCache.set(key, cached)"), "cache hits must refresh insertion order before bounded eviction");

  console.log(JSON.stringify({
    status: "PASS_A37_VISUAL_RUNTIME_PERFORMANCE_HARDENING",
    checks: checks.length,
    passed: checks.filter((check) => check.passed).length,
    runtimeCases: {
      sharedAbort: 2,
      boundedResponses: 2,
      cacheAssets: 70,
      withheld: 1,
    },
    exactRuntimeBuildBrowserClaimed: false,
    sellEnabled: false,
  }, null, 2));
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = originalFetch;
}
