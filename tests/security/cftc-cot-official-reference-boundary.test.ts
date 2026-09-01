import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CFTC_COT_DATASETS,
  CFTC_COT_INSTRUMENTS,
  CFTC_COT_RIGHTS_BOUNDARY,
  CFTC_COT_RUNTIME_POLICY,
  buildCftcCotOfficialReferenceRequest,
  cftcCotOfficialReferenceDependencies,
  loadCftcCotOfficialReference,
  projectCftcCotOfficialReferencePayload,
  resetCftcCotOfficialReferenceTestState,
} from "../../lib/market-integrity/cftc-cot-official-reference.js";

const NOW = new Date("2026-08-21T15:00:00.000Z");
const REPORT_DATE = "2026-08-18T00:00:00.000";

const WTI_ROW = {
  id: "260818067651F",
  market_and_exchange_names: "WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE",
  report_date_as_yyyy_mm_dd: REPORT_DATE,
  cftc_contract_market_code: "067651",
  open_interest_all: "1845000",
  m_money_positions_long_all: "248000",
  m_money_positions_short_all: "189000",
};

const TEN_YEAR_ROW = {
  id: "260818043602F",
  market_and_exchange_names: "UST 10Y NOTE - CHICAGO BOARD OF TRADE",
  report_date_as_yyyy_mm_dd: REPORT_DATE,
  cftc_contract_market_code: "043602",
  open_interest_all: "4210000",
  lev_money_positions_long: "660000",
  lev_money_positions_short: "1020000",
};

function jsonResponse(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function durablePermit(options: { limit: number; windowMs: number }) {
  return {
    ok: true,
    mode: "upstash_rest" as const,
    provider: "upstash" as const,
    remaining: options.limit - 1,
    resetAt: NOW.getTime() + options.windowMs,
    limit: options.limit,
    windowMs: options.windowMs,
    fixedWindowId: Math.floor(NOW.getTime() / options.windowMs),
    boundaryKey: "cftc-cot:publicreportinghub.cftc.gov",
    degraded: false,
  };
}

async function main() {
  const originalFetch = cftcCotOfficialReferenceDependencies.fetch;
  const originalReserve = cftcCotOfficialReferenceDependencies.reserveRateLimit;
  const originalGlobalFetch = globalThis.fetch;
  let physicalNetworkCalls = 0;
  globalThis.fetch = (async () => {
    physicalNetworkCalls += 1;
    throw new Error("physical_network_forbidden");
  }) as typeof fetch;

  try {
    assert.equal(CFTC_COT_DATASETS.disaggregatedFuturesOnly.id, "72hh-3qpy");
    assert.equal(CFTC_COT_DATASETS.tradersInFinancialFuturesOnly.id, "gpe5-46if");
    assert.equal(CFTC_COT_INSTRUMENTS["CL=F"].cftcContractMarketCode, "067651");
    assert.equal(CFTC_COT_INSTRUMENTS["GC=F"].cftcContractMarketCode, "088691");
    assert.equal(CFTC_COT_INSTRUMENTS["ZN=F"].cftcContractMarketCode, "043602");
    assert.equal(CFTC_COT_INSTRUMENTS["CL=F"].exactMarketAndExchangeName, "WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE");
    assert.equal(CFTC_COT_INSTRUMENTS["ZN=F"].exactMarketAndExchangeName, "UST 10Y NOTE - CHICAGO BOARD OF TRADE");
    assert.equal(CFTC_COT_RUNTIME_POLICY.maxConcurrent, 1);
    assert.equal(CFTC_COT_RUNTIME_POLICY.requestsPerMinute, 4);
    assert.equal(CFTC_COT_RUNTIME_POLICY.deadlineMs, 2_500);
    assert.equal(CFTC_COT_RUNTIME_POLICY.maxResponseBytes, 524_288);
    assert.equal(CFTC_COT_RUNTIME_POLICY.maxRows, 13);
    assert.equal(CFTC_COT_RUNTIME_POLICY.positiveCacheTtlSeconds, 21_600);
    assert.equal(CFTC_COT_RUNTIME_POLICY.negativeCacheTtlSeconds, 300);

    const keyless = buildCftcCotOfficialReferenceRequest({
      symbol: "CL=F",
      tier: "Pro",
      entitlementVerified: true,
      now: NOW,
      environment: {},
    });
    if (!keyless.ok) throw new Error(keyless.reason);
    assert.equal(keyless.ok, true);
    assert.equal(keyless.datasetId, "72hh-3qpy");
    assert.equal(keyless.headers["x-app-token"], undefined);
    assert.equal(keyless.credentialState, "keyless");
    assert.match(keyless.url, /^https:\/\/publicreportinghub\.cftc\.gov\/resource\/72hh-3qpy\.json\?/u);
    assert.match(decodeURIComponent(keyless.url), /cftc_contract_market_code='067651'/u);
    assert.match(decodeURIComponent(keyless.url), /\$limit=13/u);
    assert.doesNotMatch(keyless.url, /CFTC_SOCRATA_APP_TOKEN|undefined|null/iu);

    const tokened = buildCftcCotOfficialReferenceRequest({
      symbol: "ZN=F",
      tier: "Advanced",
      entitlementVerified: true,
      now: NOW,
      environment: { CFTC_SOCRATA_APP_TOKEN: "server_token_123" },
    });
    if (!tokened.ok) throw new Error(tokened.reason);
    assert.equal(tokened.ok, true);
    assert.equal(tokened.datasetId, "gpe5-46if");
    assert.equal(tokened.headers["x-app-token"], "server_token_123");
    assert.equal(tokened.credentialState, "server_app_token");
    assert.doesNotMatch(tokened.url, /server_token_123/u);

    for (const [label, input, reason] of [
      ["basic", { symbol: "CL=F", tier: "Basic", entitlementVerified: true, now: NOW }, "cftc_paid_tier_required"],
      ["no entitlement", { symbol: "CL=F", tier: "Pro", entitlementVerified: false, now: NOW }, "cftc_entitlement_required"],
      ["unknown", { symbol: "ES=F", tier: "Pro", entitlementVerified: true, now: NOW }, "cftc_instrument_not_whitelisted"],
      ["injection", { symbol: "CL=F' OR 1=1--", tier: "Pro", entitlementVerified: true, now: NOW }, "cftc_instrument_not_whitelisted"],
      ["expired review", { symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: new Date("2026-09-05T00:00:00.000Z") }, "cftc_rights_review_expired"],
    ] as const) {
      const result = buildCftcCotOfficialReferenceRequest(input);
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, reason, label);
    }

    const wtiProjection = projectCftcCotOfficialReferencePayload({
      symbol: "CL=F",
      datasetId: "72hh-3qpy",
      payload: [WTI_ROW, { ...WTI_ROW }],
      now: NOW,
      fetchedAt: NOW.toISOString(),
      requestUrl: keyless.url,
    });
    if (!wtiProjection.ok) throw new Error(wtiProjection.reason);
    assert.equal(wtiProjection.ok, true);
    assert.equal(wtiProjection.references.length, 1, "same-family identical rows deduplicate");
    assert.equal(wtiProjection.references[0].netPositions, 59_000);
    assert.equal(wtiProjection.references[0].ageDays, 3);
    assert.equal(wtiProjection.receipt.datasetId, "72hh-3qpy");
    assert.equal(wtiProjection.receipt.cftcContractMarketCode, "067651");
    assert.match(wtiProjection.receipt.responseSha256, /^sha256:[a-f0-9]{64}$/u);
    assert.match(wtiProjection.receipt.receiptDigest, /^sha256:[a-f0-9]{64}$/u);

    const tffProjection = projectCftcCotOfficialReferencePayload({
      symbol: "ZN=F",
      datasetId: "gpe5-46if",
      payload: [TEN_YEAR_ROW],
      now: NOW,
      fetchedAt: NOW.toISOString(),
      requestUrl: tokened.url,
    });
    if (!tffProjection.ok) throw new Error(tffProjection.reason);
    assert.equal(tffProjection.ok, true);
    assert.equal(tffProjection.references[0].positioningCategory, "leveraged_money");
    assert.equal(tffProjection.references[0].netPositions, -360_000);
    const supersededTreasuryLabel = projectCftcCotOfficialReferencePayload({
      symbol: "ZN=F",
      datasetId: "gpe5-46if",
      payload: [{
        ...TEN_YEAR_ROW,
        market_and_exchange_names: "10-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE",
      }],
      now: NOW,
      fetchedAt: NOW.toISOString(),
      requestUrl: tokened.url,
    });
    assert.equal(supersededTreasuryLabel.ok, false);
    if (supersededTreasuryLabel.ok) throw new Error("superseded Treasury market label unexpectedly accepted");
    assert.equal(supersededTreasuryLabel.reason, "cftc_market_identity_mismatch");

    for (const [label, input, reason] of [
      ["wrong dataset", { symbol: "CL=F", datasetId: "gpe5-46if", payload: [WTI_ROW] }, "cftc_dataset_mismatch"],
      ["wrong code", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, cftc_contract_market_code: "088691" }] }, "cftc_contract_code_mismatch"],
      ["wrong market identity", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, market_and_exchange_names: "GOLD - COMMODITY EXCHANGE INC." }] }, "cftc_market_identity_mismatch"],
      ["superseded WTI market label", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, market_and_exchange_names: "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE" }] }, "cftc_market_identity_mismatch"],
      ["future", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, report_date_as_yyyy_mm_dd: "2026-08-22T00:00:00.000" }] }, "cftc_report_date_future"],
      ["stale", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, report_date_as_yyyy_mm_dd: "2026-08-06T00:00:00.000" }] }, "cftc_report_stale"],
      ["malformed", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, open_interest_all: "1e9" }] }, "cftc_numeric_value_invalid"],
      ["overflow", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [{ ...WTI_ROW, open_interest_all: "9007199254740992" }] }, "cftc_numeric_value_invalid"],
      ["conflicting duplicate", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: [WTI_ROW, { ...WTI_ROW, m_money_positions_long_all: "248001" }] }, "cftc_duplicate_report_conflict"],
      ["too many rows", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: Array.from({ length: 14 }, (_, index) => ({ ...WTI_ROW, id: `row-${index}` })) }, "cftc_row_limit_exceeded"],
      ["object injection", { symbol: "CL=F", datasetId: "72hh-3qpy", payload: { $where: "1=1" } }, "cftc_payload_not_array"],
    ] as const) {
      const result = projectCftcCotOfficialReferencePayload({
        ...input,
        now: NOW,
        fetchedAt: NOW.toISOString(),
        requestUrl: keyless.url,
      });
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, reason, label);
    }

    resetCftcCotOfficialReferenceTestState();
    const reservations: Array<{ namespace?: string; key: string; limit: number; windowMs: number; cost?: number }> = [];
    const fetchCalls: Array<{ url: string; init: RequestInit; options: { timeoutMs: number; operation: string } }> = [];
    cftcCotOfficialReferenceDependencies.reserveRateLimit = async (options) => {
      reservations.push(options);
      return durablePermit(options);
    };
    cftcCotOfficialReferenceDependencies.fetch = async (url, init, options) => {
      fetchCalls.push({ url: String(url), init, options });
      return jsonResponse([WTI_ROW]);
    };
    const available = await loadCftcCotOfficialReference({
      symbol: "CL=F",
      tier: "Pro",
      entitlementVerified: true,
      now: NOW,
      environment: {},
    });
    assert.equal(available.state, "available");
    assert.equal(available.references.length, 1);
    assert.equal(available.sourceFamilyCount, 1);
    assert.equal(available.referenceOnly, true);
    assert.equal(available.historicalReferenceOnly, true);
    assert.equal(available.liveClaimed, false);
    assert.equal(available.executable, false);
    assert.equal(available.marketPriceEligible, false);
    assert.equal(available.riskScore, null);
    assert.equal(available.confidence, null);
    assert.equal(available.customerFinalCredit, false);
    assert.equal(available.goPaidState, "LEGAL_REVIEW_REQUIRED_GO_PAID");
    assert.equal(available.attribution, CFTC_COT_RIGHTS_BOUNDARY.attribution);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].options.timeoutMs, 2_500);
    assert.equal(fetchCalls[0].init.cache, "no-store");
    assert.equal(fetchCalls[0].init.method, "GET");
    assert.deepEqual(reservations, [{
      namespace: "cftc-cot:global-budget",
      key: "publicreportinghub.cftc.gov",
      limit: 4,
      windowMs: 60_000,
      cost: 1,
    }]);

    const cached = await loadCftcCotOfficialReference({
      symbol: "CL=F",
      tier: "Advanced",
      entitlementVerified: true,
      now: new Date(NOW.getTime() + 1_000),
      environment: {},
    });
    assert.equal(cached.state, "available");
    assert.equal(cached.cacheState, "positive_hit");
    assert.equal(fetchCalls.length, 1, "positive cache prevents another provider call");

    const callsBeforeBasic = fetchCalls.length;
    const reservationsBeforeBasic = reservations.length;
    const basic = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Basic", entitlementVerified: true, now: NOW });
    const missingEntitlement = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: false, now: NOW });
    const injected = await loadCftcCotOfficialReference({ symbol: "CL=F&$limit=50000", tier: "Advanced", entitlementVerified: true, now: NOW });
    assert.equal(basic.state, "withheld");
    assert.equal(basic.blocker, "cftc_paid_tier_required");
    assert.equal(missingEntitlement.blocker, "cftc_entitlement_required");
    assert.equal(injected.blocker, "cftc_instrument_not_whitelisted");
    assert.equal(fetchCalls.length, callsBeforeBasic, "preflight blockers make zero provider calls");
    assert.equal(reservations.length, reservationsBeforeBasic, "preflight blockers reserve no provider quota");

    for (const failure of [
      { label: "429", response: jsonResponse({ error: "too many" }, 429, { "retry-after": "999999" }), blocker: "cftc_http_429", retryAfterSeconds: 3_600 },
      { label: "5xx", response: jsonResponse({ error: "down" }, 503), blocker: "cftc_http_503", retryAfterSeconds: null },
      { label: "oversized", response: new Response("[]", { status: 200, headers: { "content-type": "application/json", "content-length": "524289" } }), blocker: "cftc_response_too_large", retryAfterSeconds: null },
      { label: "malformed json", response: new Response("{", { status: 200, headers: { "content-type": "application/json" } }), blocker: "cftc_response_invalid_json", retryAfterSeconds: null },
    ] as const) {
      resetCftcCotOfficialReferenceTestState();
      let calls = 0;
      cftcCotOfficialReferenceDependencies.fetch = async () => { calls += 1; return failure.response; };
      const first = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: NOW });
      const second = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: new Date(NOW.getTime() + 1_000) });
      assert.equal(first.state, "temporarily_unavailable", failure.label);
      assert.equal(first.blocker, failure.blocker, failure.label);
      assert.equal(first.retryAfterSeconds, failure.retryAfterSeconds, failure.label);
      assert.equal(second.cacheState, "negative_hit", failure.label);
      assert.equal(calls, 1, `${failure.label} is not immediately retried`);
    }

    resetCftcCotOfficialReferenceTestState();
    cftcCotOfficialReferenceDependencies.fetch = async () => { throw new Error("fetch_deadline_exceeded"); };
    const timedOut = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: NOW });
    assert.equal(timedOut.blocker, "cftc_timeout");

    resetCftcCotOfficialReferenceTestState();
    cftcCotOfficialReferenceDependencies.fetch = async () => jsonResponse([{
      ...WTI_ROW,
      report_date_as_yyyy_mm_dd: "2026-08-06T00:00:00.000",
    }]);
    const staleProviderRow = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: NOW });
    assert.equal(staleProviderRow.state, "withheld");
    assert.equal(staleProviderRow.blocker, "cftc_report_stale");
    assert.equal(staleProviderRow.references.length, 0);
    assert.equal(staleProviderRow.liveClaimed, false);
    assert.equal(staleProviderRow.riskScore, null);
    assert.equal(staleProviderRow.confidence, null);

    resetCftcCotOfficialReferenceTestState();
    cftcCotOfficialReferenceDependencies.reserveRateLimit = async (options) => ({
      ...durablePermit(options),
      ok: false,
      mode: "unavailable" as const,
      remaining: 0,
      degraded: true,
      reason: "rate_limit_store_unavailable",
    });
    let callsAfterUnavailableLimiter = 0;
    cftcCotOfficialReferenceDependencies.fetch = async () => { callsAfterUnavailableLimiter += 1; return jsonResponse([WTI_ROW]); };
    const unavailableLimiter = await loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: NOW });
    assert.equal(unavailableLimiter.blocker, "cftc_rate_limit_store_unavailable");
    assert.equal(callsAfterUnavailableLimiter, 0, "durable limiter failure closes before network");

    resetCftcCotOfficialReferenceTestState();
    cftcCotOfficialReferenceDependencies.reserveRateLimit = async (options) => durablePermit(options);
    let releaseFirst!: (value: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { releaseFirst = resolve; });
    let activeCalls = 0;
    let maxActiveCalls = 0;
    cftcCotOfficialReferenceDependencies.fetch = async (_url) => {
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
      const response = await firstResponse;
      activeCalls -= 1;
      return response;
    };
    const inFlight = loadCftcCotOfficialReference({ symbol: "CL=F", tier: "Pro", entitlementVerified: true, now: NOW });
    await Promise.resolve();
    await Promise.resolve();
    const concurrent = await loadCftcCotOfficialReference({ symbol: "GC=F", tier: "Pro", entitlementVerified: true, now: NOW });
    assert.equal(concurrent.blocker, "cftc_concurrency_budget_exhausted");
    releaseFirst(jsonResponse([WTI_ROW]));
    assert.equal((await inFlight).state, "available");
    assert.equal(maxActiveCalls, 1);

    const routeSource = await readFile(new URL("../../lib/market-integrity/real-markets-route-orchestrator.ts", import.meta.url), "utf8");
    assert.match(routeSource, /referenceCot/u);
    assert.match(routeSource, /loadCftcCotOfficialReference/u);
    assert.match(routeSource, /const cftcEntitlementVerified = cftcPaidAccessGate\.paidRequired/u);
    assert.match(routeSource, /entitlementVerified:\s*cftcEntitlementVerified/u);
    assert.match(routeSource, /cftcCotOfficialReference/u);
    assert.match(routeSource, /historical official positioning reference only/iu);

    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.policyReviewedAt, "2026-08-21T00:00:00.000Z");
    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.reverifyBy, "2026-09-04T23:59:59.999Z");
    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.legalReviewRequired, true);
    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.productionPaidDisplayAuthorized, false);
    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.thirdPartyMaterialExcluded, true);
    assert.equal(CFTC_COT_RIGHTS_BOUNDARY.customerFinalCredit, false);
    assert.match(CFTC_COT_RIGHTS_BOUNDARY.attribution, /Commodity Futures Trading Commission.*Commitments of Traders/iu);
    assert.equal(physicalNetworkCalls, 0);

    console.log("PASS CFTC COT official Futures Only reference is strict, entitlement-gated, bounded, deduplicated and claim-safe without network");
  } finally {
    resetCftcCotOfficialReferenceTestState();
    cftcCotOfficialReferenceDependencies.fetch = originalFetch;
    cftcCotOfficialReferenceDependencies.reserveRateLimit = originalReserve;
    globalThis.fetch = originalGlobalFetch;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
