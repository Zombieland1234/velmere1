#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const runtime = await import(new URL("../../components/market-integrity/asset-detail/market-intelligence-client-runtime.ts", import.meta.url));
const checks = [];
const assert = (name, condition, detail) => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const asset = (symbol, assetClass = "crypto", providerSymbol = symbol) => ({ symbol, providerSymbol, assetClass });
const marketImpact = (symbol) => ({
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
});
const whaleWatch = (symbol) => ({
  schemaVersion: "test",
  assetKey: symbol,
  generatedAt: new Date(0).toISOString(),
  evidenceStatus: "fixture_only",
  advancedReady: false,
  providerFamilies: ["fixture"],
  flowWindows: [],
  alerts: [],
  missingEvidence: [],
  blockers: [],
  evidenceDigest: "b".repeat(64),
  available: true,
});
const payload = ({ symbol = "BTC", depth = "basic", surface = "shield", includeWhale = false } = {}) => ({
  ok: true,
  mode: "partial",
  depth,
  surface,
  assetKey: symbol,
  marketImpact: marketImpact(symbol),
  ...(includeWhale ? { whaleWatch: whaleWatch(symbol) } : {}),
});
const response = (body, { status = 200, contentType = "application/json", depthHeader } = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": contentType,
    ...(depthHeader ? { "x-velmere-market-intelligence-depth": depthHeader } : {}),
  },
});
const rejectionMessage = async (promise) => promise.then(
  () => "resolved",
  (error) => error instanceof Error ? error.message : String(error),
);

const originalFetch = globalThis.fetch;
try {
  runtime.pass35A37ResetRuntimeForTests();
  let positiveFetches = 0;
  globalThis.fetch = (_url, init = {}) => {
    positiveFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(response(payload({ symbol: request.assetKey, depth: request.depth, surface: request.surface, includeWhale: request.depth === "pro" }), { depthHeader: request.depth }));
  };
  const normalizedAsset = asset("btc", "crypto", " btc ");
  const positiveA = await runtime.fetchRuntime(normalizedAsset, "en", "basic", new AbortController().signal);
  const positiveB = await runtime.fetchRuntime(normalizedAsset, "en", "basic", new AbortController().signal);
  assert("positive_binding_normalizes_requested_asset", positiveA.assetKey === "BTC" && positiveA.marketImpact?.assetKey === "BTC", "request and response must bind to the server-normalized asset key");
  assert("positive_binding_cache_hit", positiveFetches === 1 && positiveB.assetKey === "BTC", `expected one positive transport, received ${positiveFetches}`);
  assert("positive_cache_classified", runtime.pass35A37RuntimeSnapshot().positiveCacheEntries === 1, "verified response must occupy the positive cache lane");

  const mismatchCases = [
    {
      name: "top_level_asset_mismatch",
      requested: asset("BTC"),
      depth: "basic",
      body: payload({ symbol: "ETH" }),
      expected: "market_intelligence_response_binding_mismatch",
    },
    {
      name: "nested_market_asset_mismatch",
      requested: asset("BTC"),
      depth: "basic",
      body: { ...payload({ symbol: "BTC" }), marketImpact: marketImpact("ETH") },
      expected: "market_intelligence_response_binding_mismatch",
    },
    {
      name: "nested_whale_asset_mismatch",
      requested: asset("BTC"),
      depth: "pro",
      body: { ...payload({ symbol: "BTC", depth: "pro", includeWhale: true }), whaleWatch: whaleWatch("ETH") },
      expected: "market_intelligence_response_binding_mismatch",
    },
    {
      name: "depth_mismatch",
      requested: asset("BTC"),
      depth: "basic",
      body: payload({ symbol: "BTC", depth: "pro", includeWhale: true }),
      expected: "market_intelligence_response_binding_mismatch",
    },
    {
      name: "surface_mismatch",
      requested: asset("AAPL", "equity"),
      depth: "basic",
      body: payload({ symbol: "AAPL", surface: "shield" }),
      expected: "market_intelligence_response_binding_mismatch",
    },
    {
      name: "basic_tier_whale_leak",
      requested: asset("BTC"),
      depth: "basic",
      body: payload({ symbol: "BTC", depth: "basic", includeWhale: true }),
      expected: "market_intelligence_tier_boundary_violation",
    },
  ];
  for (const testCase of mismatchCases) {
    runtime.pass35A37ResetRuntimeForTests();
    let fetches = 0;
    globalThis.fetch = () => {
      fetches += 1;
      return Promise.resolve(response(testCase.body));
    };
    const first = await rejectionMessage(runtime.fetchRuntime(testCase.requested, "en", testCase.depth, new AbortController().signal));
    const second = await rejectionMessage(runtime.fetchRuntime(testCase.requested, "en", testCase.depth, new AbortController().signal));
    assert(`${testCase.name}_rejected`, first === testCase.expected && second === testCase.expected, `${testCase.name} returned ${first} / ${second}`);
    assert(`${testCase.name}_not_cached`, fetches === 2 && runtime.pass35A37RuntimeSnapshot().cacheEntries === 0, `${testCase.name} must not enter cache`);
  }

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = (_url, init = {}) => {
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(response(payload({ symbol: request.assetKey, depth: request.depth, surface: request.surface }), { depthHeader: "pro" }));
  };
  const headerMismatch = await rejectionMessage(runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal));
  assert("response_header_depth_bound", headerMismatch === "market_intelligence_response_binding_mismatch", `unexpected header mismatch result ${headerMismatch}`);

  runtime.pass35A37ResetRuntimeForTests();
  let forbiddenFetches = 0;
  globalThis.fetch = () => {
    forbiddenFetches += 1;
    return Promise.resolve(response({ ok: false, error: "access_denied" }, { status: 403 }));
  };
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  assert("authorization_error_not_cached", forbiddenFetches === 2 && runtime.pass35A37RuntimeSnapshot().cacheEntries === 0, "403 authorization responses must not pin stale entitlement state");

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A39ConfigureRuntimeForTests({ withheldTtlMs: 20 });
  let withheldFetches = 0;
  globalThis.fetch = (_url, init = {}) => {
    withheldFetches += 1;
    const request = JSON.parse(String(init.body || "{}"));
    return Promise.resolve(response({ ok: false, mode: "withheld", error: "paid_market_intelligence_publication_not_ready", depth: request.depth, surface: request.surface, assetKey: request.assetKey }, { status: 424, depthHeader: request.depth }));
  };
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  assert("withheld_short_cache_hit", withheldFetches === 1 && runtime.pass35A37RuntimeSnapshot().withheldCacheEntries === 1, "bounded withheld result should suppress immediate duplicate requests");
  await sleep(35);
  await runtime.fetchRuntime(asset("BTC"), "en", "pro", new AbortController().signal);
  assert("withheld_short_cache_expires", withheldFetches === 2, `withheld cache did not expire, fetches=${withheldFetches}`);

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A39ConfigureRuntimeForTests({ requestTimeoutMs: 20 });
  globalThis.fetch = (_url, init = {}) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  const timeoutResult = await rejectionMessage(runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal));
  assert("request_timeout_fail_closed", timeoutResult === "market_intelligence_timeout", `unexpected timeout result ${timeoutResult}`);
  assert("request_timeout_cleans_inflight", runtime.pass35A37RuntimeSnapshot().inflightEntries === 0, "timed-out request must leave no inflight entry");

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = () => Promise.resolve(response({ ok: true }, { contentType: "text/html" }));
  const contentTypeResult = await rejectionMessage(runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal));
  assert("non_json_response_rejected", contentTypeResult === "market_intelligence_invalid_content_type", `unexpected content type result ${contentTypeResult}`);

  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = () => Promise.resolve(new Response(new Uint8Array([0xc3, 0x28]), { status: 200, headers: { "content-type": "application/json" } }));
  const invalidUtf8Result = await rejectionMessage(runtime.fetchRuntime(asset("BTC"), "en", "basic", new AbortController().signal));
  assert("invalid_utf8_rejected", invalidUtf8Result !== "resolved", "invalid UTF-8 JSON must fail before cache/render");
  assert("invalid_transport_payload_not_cached", runtime.pass35A37RuntimeSnapshot().cacheEntries === 0, "invalid transport payload must not enter cache");

  const cssScan = JSON.parse(execFileSync(process.execPath, [path.join(root, "scripts/pass35/optimize-a39-css.mjs")], { cwd: root, encoding: "utf8" }));
  assert("css_exact_duplicate_groups_zero", cssScan.totals.duplicateExtras === 0, `remaining exact CSS duplicates: ${cssScan.totals.duplicateExtras}`);
  assert("global_css_reduced_from_a38", fs.statSync(path.join(root, "app/globals.css")).size < 3_521_005, "global CSS must remain below the A38 byte baseline after exact duplicate removal");

  const vault = read("components/intelligence/IntelligenceResearchVault.tsx");
  const vaultCss = read("components/intelligence/IntelligenceLuxury.module.css");
  assert("research_vault_region_binding", vault.includes('role="region"') && vault.includes('aria-labelledby={`research-vault-trigger-${activeLab}`}'), "active research panel must be bound to its trigger");
  assert("research_vault_escape_close", vault.includes('event.key !== "Escape"') && vault.includes("closeActiveLab();"), "research panel must support Escape close");
  assert("research_vault_focus_restore", vault.includes("triggerRefs.current[closingLab]?.focus") && vault.includes("panelRef.current?.focus"), "open and close must manage focus deterministically");
  assert("research_vault_loading_announced", vault.includes('role="status" aria-live="polite"'), "dynamic research loading must be announced");
  assert("research_vault_offscreen_containment", /content-visibility\s*:\s*auto/u.test(vaultCss) && /contain-intrinsic-block-size\s*:/u.test(vaultCss), "offscreen research chapters must use bounded rendering containment where supported");

  const intelligencePage = read("app/[locale]/intelligence/page.tsx");
  assert("json_ld_script_escaped", intelligencePage.includes("serializeStructuredData") && intelligencePage.includes('.replace(/</g, "\\\\u003c")'), "JSON-LD serialization must escape script-breaking less-than characters");

  const runtimeSource = read("components/market-integrity/asset-detail/market-intelligence-client-runtime.ts");
  assert("runtime_binding_function_present", runtimeSource.includes("assertRuntimeBinding") && runtimeSource.includes("market_intelligence_tier_boundary_violation"), "runtime must contain explicit identity and tier binding");
  assert("runtime_timeout_present", runtimeSource.includes("MAX_RUNTIME_REQUEST_MS") && runtimeSource.includes("market_intelligence_timeout"), "runtime must enforce a hard request timeout");
  assert("runtime_negative_cache_separated", runtimeSource.includes('RuntimeCacheClass = "positive" | "withheld"') && runtimeSource.includes("WITHHELD_CACHE_TTL_MS"), "withheld and positive cache policy must remain separate");

  console.log(JSON.stringify({
    status: "PASS_A39_RUNTIME_BINDING_CSS_A11Y_HARDENING",
    checks: checks.length,
    passed: checks.filter((check) => check.passed).length,
    runtimeCases: {
      positiveBinding: 2,
      mismatchCases: mismatchCases.length * 2,
      headerMismatch: 1,
      authorizationNoCache: 2,
      withheldTtl: 3,
      timeout: 1,
      invalidTransport: 2,
    },
    css: {
      exactDuplicateExtras: cssScan.totals.duplicateExtras,
      globalsBytes: fs.statSync(path.join(root, "app/globals.css")).size,
      a38GlobalsBytes: 3_521_005,
    },
    exactRuntimeBuildBrowserClaimed: false,
    sellEnabled: false,
  }, null, 2));
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch = originalFetch;
}
