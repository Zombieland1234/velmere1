import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  WORLD_BANK_WDI_FX_INSTRUMENTS,
  WORLD_BANK_WDI_INDICATORS,
  WORLD_BANK_WDI_RIGHTS_BOUNDARY,
  WORLD_BANK_WDI_RUNTIME_POLICY,
  buildWorldBankWdiOfficialReferenceRequest,
  loadWorldBankWdiOfficialReference,
  projectWorldBankWdiOfficialReferencePayloads,
  resetWorldBankWdiOfficialReferenceTestState,
  worldBankWdiOfficialReferenceDependencies,
} from "../../lib/market-integrity/world-bank-wdi-official-reference.js";

const NOW = new Date("2026-08-21T15:00:00.000Z");

type FixtureRow = {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number;
  obs_status: string;
  decimal: number;
};

type FixturePayload = [
  { page: number; pages: number; per_page: number; total: number; sourceid: null | string; lastupdated: string },
  FixtureRow[],
];

function payload(indicatorId: keyof typeof WORLD_BANK_WDI_INDICATORS): FixturePayload {
  const indicator = WORLD_BANK_WDI_INDICATORS[indicatorId];
  const inflation = indicator.id === "FP.CPI.TOTL.ZG";
  return [
    { page: 1, pages: 1, per_page: 6, total: 6, sourceid: null, lastupdated: "2026-07-13" },
    [
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "XC", value: "Euro area" },
        countryiso3code: "EMU",
        date: "2025",
        value: inflation ? 2.46705543774613 : 6.28355946264135,
        obs_status: "",
        decimal: 1,
      },
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "XC", value: "Euro area" },
        countryiso3code: "EMU",
        date: "2024",
        value: inflation ? 2.2564981433876 : 6.34778064605911,
        obs_status: "",
        decimal: 1,
      },
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "XC", value: "Euro area" },
        countryiso3code: "EMU",
        date: "2023",
        value: inflation ? 5.94643667725823 : 6.52267389015226,
        obs_status: "",
        decimal: 1,
      },
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "US", value: "United States" },
        countryiso3code: "USA",
        date: inflation ? "2024" : "2025",
        value: inflation ? 2.94952520485207 : 4.198,
        obs_status: "",
        decimal: 1,
      },
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "US", value: "United States" },
        countryiso3code: "USA",
        date: inflation ? "2023" : "2024",
        value: inflation ? 4.11633838374488 : 4.022,
        obs_status: "",
        decimal: 1,
      },
      {
        indicator: { id: indicator.id, value: indicator.label },
        country: { id: "US", value: "United States" },
        countryiso3code: "USA",
        date: inflation ? "2022" : "2023",
        value: inflation ? 8.00279982052121 : 3.638,
        obs_status: "",
        decimal: 1,
      },
    ],
  ];
}

function jsonResponse(value: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function durablePermit(options: { limit: number; windowMs: number }) {
  return {
    ok: true,
    mode: "upstash_rest" as const,
    provider: "upstash" as const,
    remaining: options.limit - WORLD_BANK_WDI_RUNTIME_POLICY.requestCost,
    resetAt: NOW.getTime() + options.windowMs,
    limit: options.limit,
    windowMs: options.windowMs,
    fixedWindowId: Math.floor(NOW.getTime() / options.windowMs),
    boundaryKey: "world-bank-wdi:api.worldbank.org",
    degraded: false,
  };
}

async function main() {
  const originalFetch = worldBankWdiOfficialReferenceDependencies.fetch;
  const originalReserve = worldBankWdiOfficialReferenceDependencies.reserveRateLimit;
  const originalGlobalFetch = globalThis.fetch;
  let physicalNetworkCalls = 0;
  globalThis.fetch = (async () => {
    physicalNetworkCalls += 1;
    throw new Error("physical_network_forbidden");
  }) as typeof fetch;

  try {
    assert.deepEqual(WORLD_BANK_WDI_FX_INSTRUMENTS["EURUSD=X"].countries, ["EMU", "USA"]);
    assert.deepEqual(WORLD_BANK_WDI_FX_INSTRUMENTS["JPY=X"].countries, ["USA", "JPN"]);
    assert.equal(WORLD_BANK_WDI_INDICATORS.inflation.id, "FP.CPI.TOTL.ZG");
    assert.equal(WORLD_BANK_WDI_INDICATORS.unemployment.id, "SL.UEM.TOTL.ZS");
    assert.equal(WORLD_BANK_WDI_RUNTIME_POLICY.requestsPerMinute, 6);
    assert.equal(WORLD_BANK_WDI_RUNTIME_POLICY.requestCost, 2);
    assert.equal(WORLD_BANK_WDI_RUNTIME_POLICY.maxConcurrent, 1);
    assert.equal(WORLD_BANK_WDI_RUNTIME_POLICY.positiveCacheTtlSeconds, 86_400);
    assert.equal(WORLD_BANK_WDI_RUNTIME_POLICY.negativeCacheTtlSeconds, 300);

    const request = buildWorldBankWdiOfficialReferenceRequest({
      symbol: "EURUSD=X",
      tier: "Pro",
      entitlementVerified: true,
      productionLike: false,
      now: NOW,
    });
    assert.equal(request.ok, true);
    if (!request.ok) throw new Error(request.reason);
    assert.equal(request.urls.length, 2);
    for (const item of request.urls) {
      const url = new URL(item.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "api.worldbank.org");
      assert.equal(url.pathname, `/v2/country/EMU;USA/indicator/${item.indicatorId}`);
      assert.equal(url.searchParams.get("format"), "json");
      assert.equal(url.searchParams.get("mrnev"), "3");
      assert.equal(url.searchParams.get("per_page"), "6");
      assert.equal(url.username, "");
      assert.equal(url.password, "");
    }

    for (const [label, input, reason] of [
      ["basic", { symbol: "EURUSD=X", tier: "Basic", entitlementVerified: true, productionLike: false, now: NOW }, "world_bank_paid_tier_required"],
      ["no entitlement", { symbol: "EURUSD=X", tier: "Pro", entitlementVerified: false, productionLike: false, now: NOW }, "world_bank_entitlement_required"],
      ["unknown", { symbol: "EURUSD=X&country=all", tier: "Advanced", entitlementVerified: true, productionLike: false, now: NOW }, "world_bank_instrument_not_whitelisted"],
      ["production legal gate", { symbol: "EURUSD=X", tier: "Pro", entitlementVerified: true, productionLike: true, now: NOW }, "world_bank_go_paid_legal_review_required"],
      ["rights expired", { symbol: "EURUSD=X", tier: "Pro", entitlementVerified: true, productionLike: false, now: new Date("2026-09-05T00:00:00.000Z") }, "world_bank_rights_review_expired"],
    ] as const) {
      const result = buildWorldBankWdiOfficialReferenceRequest(input);
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, reason, label);
    }

    const projection = projectWorldBankWdiOfficialReferencePayloads({
      symbol: "EURUSD=X",
      now: NOW,
      fetchedAt: NOW.toISOString(),
      responses: request.urls.map((item) => ({
        indicatorId: item.indicatorId,
        requestUrl: item.url,
        payload: payload(item.indicatorKey),
      })),
    });
    assert.equal(projection.ok, true);
    if (!projection.ok) throw new Error(projection.reason);
    assert.equal(projection.references.length, 12);
    assert.equal(projection.receipts.length, 2);
    assert.equal(projection.sourceFamilyCount, 1);
    assert.equal(projection.references.every((row) => row.referenceOnly && row.historicalAnnualReferenceOnly), true);
    assert.equal(projection.references.every((row) => row.liveClaimed === false && row.executable === false), true);
    assert.equal(projection.references.every((row) => row.riskScore === null && row.confidence === null), true);
    assert.equal(projection.references.every((row) => row.unit === "percent_per_year"), true);
    assert.match(projection.aggregateReceiptDigest, /^sha256:[a-f0-9]{64}$/u);

    for (const [label, mutate, reason] of [
      ["wrong country", (value: FixturePayload) => { value[1][0].countryiso3code = "FRA"; }, "world_bank_country_identity_mismatch"],
      ["wrong country API id", (value: FixturePayload) => { value[1][0].country.id = "FR"; }, "world_bank_country_identity_mismatch"],
      ["wrong indicator", (value: FixturePayload) => { value[1][0].indicator.id = "NY.GDP.MKTP.CD"; }, "world_bank_indicator_identity_mismatch"],
      ["future year", (value: FixturePayload) => { value[1][0].date = "2027"; }, "world_bank_observation_year_future"],
      ["invalid unemployment", (value: FixturePayload) => { value[1][0].value = 101; }, "world_bank_value_out_of_range"],
      ["duplicate conflict", (value: FixturePayload) => { value[1][1] = { ...value[1][0], value: 99 }; }, "world_bank_duplicate_observation_conflict"],
      ["wrong source metadata", (value: FixturePayload) => { value[0].sourceid = "999"; }, "world_bank_metadata_invalid"],
    ] as const) {
      const inflationPayload = structuredClone(payload("inflation"));
      const unemploymentPayload = structuredClone(payload("unemployment"));
      const target = label === "invalid unemployment" ? unemploymentPayload : inflationPayload;
      mutate(target);
      const result = projectWorldBankWdiOfficialReferencePayloads({
        symbol: "EURUSD=X",
        now: NOW,
        fetchedAt: NOW.toISOString(),
        responses: request.urls.map((item) => ({
          indicatorId: item.indicatorId,
          requestUrl: item.url,
          payload: item.indicatorKey === "inflation" ? inflationPayload : unemploymentPayload,
        })),
      });
      assert.equal(result.ok, false, label);
      if (result.ok) throw new Error(`${label} unexpectedly accepted`);
      assert.equal(result.reason, reason, label);
    }

    resetWorldBankWdiOfficialReferenceTestState();
    const reservations: Array<{ namespace?: string; key: string; limit: number; windowMs: number; cost?: number }> = [];
    const fetchCalls: string[] = [];
    worldBankWdiOfficialReferenceDependencies.reserveRateLimit = async (options) => {
      reservations.push(options);
      return durablePermit(options);
    };
    worldBankWdiOfficialReferenceDependencies.fetch = async (input) => {
      const url = String(input);
      fetchCalls.push(url);
      return jsonResponse(url.includes("FP.CPI.TOTL.ZG") ? payload("inflation") : payload("unemployment"));
    };
    const available = await loadWorldBankWdiOfficialReference({
      symbol: "EURUSD=X",
      tier: "Pro",
      entitlementVerified: true,
      productionLike: false,
      now: NOW,
    });
    assert.equal(available.state, "available");
    assert.equal(available.references.length, 12);
    assert.equal(available.referenceOnly, true);
    assert.equal(available.liveClaimed, false);
    assert.equal(available.executable, false);
    assert.equal(available.marketPriceEligible, false);
    assert.equal(available.riskScore, null);
    assert.equal(available.confidence, null);
    assert.equal(available.customerFinalCredit, false);
    assert.equal(available.goPaidState, "LEGAL_REVIEW_REQUIRED_GO_PAID");
    assert.equal(available.attribution, WORLD_BANK_WDI_RIGHTS_BOUNDARY.attribution);
    assert.equal(fetchCalls.length, 2);
    assert.deepEqual(reservations, [{
      namespace: "world-bank-wdi:global-budget",
      key: "api.worldbank.org",
      limit: 6,
      windowMs: 60_000,
      cost: 2,
    }]);

    const cached = await loadWorldBankWdiOfficialReference({
      symbol: "EURUSD=X",
      tier: "Advanced",
      entitlementVerified: true,
      productionLike: false,
      now: new Date(NOW.getTime() + 1_000),
    });
    assert.equal(cached.state, "available");
    assert.equal(cached.cacheState, "positive_hit");
    assert.equal(fetchCalls.length, 2);

    const callsBeforeBlocked = fetchCalls.length;
    const reservationsBeforeBlocked = reservations.length;
    for (const blocked of [
      await loadWorldBankWdiOfficialReference({ symbol: "EURUSD=X", tier: "Basic", entitlementVerified: true, productionLike: false, now: NOW }),
      await loadWorldBankWdiOfficialReference({ symbol: "EURUSD=X", tier: "Pro", entitlementVerified: false, productionLike: false, now: NOW }),
      await loadWorldBankWdiOfficialReference({ symbol: "EURUSD=X", tier: "Pro", entitlementVerified: true, productionLike: true, now: NOW }),
      await loadWorldBankWdiOfficialReference({ symbol: "BAD", tier: "Advanced", entitlementVerified: true, productionLike: false, now: NOW }),
    ]) {
      assert.equal(blocked.state, "withheld");
      assert.equal(blocked.references.length, 0);
    }
    assert.equal(fetchCalls.length, callsBeforeBlocked, "preflight blockers make zero provider calls");
    assert.equal(reservations.length, reservationsBeforeBlocked, "preflight blockers reserve no provider quota");

    resetWorldBankWdiOfficialReferenceTestState();
    worldBankWdiOfficialReferenceDependencies.reserveRateLimit = async (options) => ({
      ...durablePermit(options),
      ok: false,
      mode: "unavailable" as const,
      remaining: 0,
      degraded: true,
      reason: "rate_limit_store_unavailable",
    });
    let callsAfterLimiterFailure = 0;
    worldBankWdiOfficialReferenceDependencies.fetch = async () => {
      callsAfterLimiterFailure += 1;
      return jsonResponse(payload("inflation"));
    };
    const limiterFailure = await loadWorldBankWdiOfficialReference({
      symbol: "EURUSD=X",
      tier: "Pro",
      entitlementVerified: true,
      productionLike: false,
      now: NOW,
    });
    assert.equal(limiterFailure.blocker, "world_bank_rate_limit_store_unavailable");
    assert.equal(callsAfterLimiterFailure, 0);

    resetWorldBankWdiOfficialReferenceTestState();
    worldBankWdiOfficialReferenceDependencies.reserveRateLimit = async (options) => durablePermit(options);
    let failureCalls = 0;
    worldBankWdiOfficialReferenceDependencies.fetch = async () => {
      failureCalls += 1;
      return jsonResponse({ message: "too many" }, 429, { "retry-after": "999999" });
    };
    const rateLimited = await loadWorldBankWdiOfficialReference({
      symbol: "EURUSD=X",
      tier: "Pro",
      entitlementVerified: true,
      productionLike: false,
      now: NOW,
    });
    assert.equal(rateLimited.blocker, "world_bank_http_429");
    assert.equal(rateLimited.retryAfterSeconds, 3_600);
    assert.equal(failureCalls, 1, "second indicator is not fetched after first failure");

    assert.equal(physicalNetworkCalls, 0);
    assert.equal(WORLD_BANK_WDI_RIGHTS_BOUNDARY.thirdPartyMaterialExcluded, true);
    assert.equal(WORLD_BANK_WDI_RIGHTS_BOUNDARY.license, "CC-BY-4.0");
    assert.equal(WORLD_BANK_WDI_RIGHTS_BOUNDARY.productionPaidDisplayAuthorized, false);
    assert.equal(WORLD_BANK_WDI_RIGHTS_BOUNDARY.legalReviewRequired, true);

    const routeSource = await readFile(
      new URL("../../lib/market-integrity/real-markets-route-orchestrator.ts", import.meta.url),
      "utf8",
    );
    const macroBranch = routeSource.indexOf('url.searchParams.get("referenceMacro") === "1"');
    const genericQuotePreflight = routeSource.indexOf('buildRealMarketsGenericDeliveryPreflight("quotes")');
    const paidAccess = routeSource.indexOf("const worldBankPaidAccessGate = await resolveVlmPaidSurfaceAccess", macroBranch);
    const providerLoad = routeSource.indexOf("const worldBankWdiOfficialReference = await loadWorldBankWdiOfficialReference", macroBranch);
    assert.ok(macroBranch > 0, "route exposes the explicit World Bank macro reference lane");
    assert.ok(genericQuotePreflight > macroBranch, "official reference lane is separate from blocked generic quote providers");
    assert.ok(paidAccess > macroBranch && providerLoad > paidAccess, "entitlement is verified before provider execution");
    assert.match(routeSource.slice(macroBranch, paidAccess), /world_bank_paid_tier_required/u);
    assert.match(routeSource.slice(macroBranch, paidAccess), /world_bank_go_paid_legal_review_required/u);
    assert.match(routeSource.slice(macroBranch, genericQuotePreflight), /riskScore:\s*null/u);
    assert.match(routeSource.slice(macroBranch, genericQuotePreflight), /confidence:\s*null/u);
    assert.match(routeSource.slice(macroBranch, genericQuotePreflight), /liveClaimed:\s*false/u);

    const { handleRealMarketsGet } = await import("../../lib/market-integrity/real-markets-route-orchestrator.js");
    const basicResponse = await handleRealMarketsGet(new Request(
      "http://127.0.0.1/api/market-integrity/real-markets?ids=eurusd&tier=basic&referenceMacro=1",
    ));
    const basicBody = await basicResponse.json() as Record<string, unknown>;
    assert.equal(basicResponse.status, 403);
    assert.equal(basicBody.error, "world_bank_paid_tier_required");
    assert.deepEqual(basicBody.references, []);
    assert.deepEqual(basicBody.quotes, []);
    assert.equal(basicBody.riskScore, null);
    assert.equal(basicBody.confidence, null);
    assert.equal(basicBody.liveClaimed, false);

    const unauthenticatedPaidResponse = await handleRealMarketsGet(new Request(
      "http://127.0.0.1/api/market-integrity/real-markets?ids=eurusd&tier=pro&referenceMacro=1",
    ));
    assert.equal(unauthenticatedPaidResponse.status, 402);

    const conflictingModeResponse = await handleRealMarketsGet(new Request(
      "http://127.0.0.1/api/market-integrity/real-markets?ids=eurusd&tier=pro&referenceMacro=1&referenceFx=1",
    ));
    const conflictingModeBody = await conflictingModeResponse.json() as Record<string, unknown>;
    assert.equal(conflictingModeResponse.status, 400);
    assert.equal(conflictingModeBody.error, "exactly_one_official_reference_mode_required");
    assert.deepEqual(conflictingModeBody.references, []);
    assert.equal(conflictingModeBody.riskScore, null);
    assert.equal(conflictingModeBody.liveClaimed, false);

    const unsupportedResponse = await handleRealMarketsGet(new Request(
      "http://127.0.0.1/api/market-integrity/real-markets?ids=btc&tier=pro&referenceMacro=1",
    ));
    const unsupportedBody = await unsupportedResponse.json() as Record<string, unknown>;
    assert.equal(unsupportedResponse.status, 400);
    assert.equal(unsupportedBody.error, "world_bank_reference_requires_exact_supported_fx_symbol");

    const previousVercelEnvironment = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      const productionResponse = await handleRealMarketsGet(new Request(
        "http://127.0.0.1/api/market-integrity/real-markets?ids=eurusd&tier=pro&referenceMacro=1",
      ));
      const productionBody = await productionResponse.json() as Record<string, unknown>;
      assert.equal(productionResponse.status, 503);
      assert.equal(productionBody.error, "world_bank_go_paid_legal_review_required");
      assert.deepEqual(productionBody.references, []);
      assert.equal(productionBody.riskScore, null);
      assert.equal(productionBody.liveClaimed, false);
    } finally {
      if (previousVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previousVercelEnvironment;
    }
    assert.equal(physicalNetworkCalls, 0, "all route-level denial paths close before network");
    console.log(JSON.stringify({
      ok: true,
      checks: "world_bank_wdi_official_reference_boundary",
      supportedFxSymbols: Object.keys(WORLD_BANK_WDI_FX_INSTRUMENTS).length,
      physicalNetworkCalls,
    }));
  } finally {
    worldBankWdiOfficialReferenceDependencies.fetch = originalFetch;
    worldBankWdiOfficialReferenceDependencies.reserveRateLimit = originalReserve;
    globalThis.fetch = originalGlobalFetch;
    resetWorldBankWdiOfficialReferenceTestState();
  }
}

void main();
