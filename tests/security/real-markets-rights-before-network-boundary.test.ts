import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  REAL_MARKETS_GENERIC_DELIVERY_POLICY_ID,
  buildRealMarketsGenericDeliveryPreflight,
  projectRealMarketsGenericCustomerDelivery,
  toRealMarketsGenericCustomerSafeWithheld,
  verifyRealMarketsGenericDeliveryPreflight,
} from "../../lib/market-integrity/real-markets-generic-delivery-policy.js";
import { handleRealMarketsGet } from "../../lib/market-integrity/real-markets-route-orchestrator.js";

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

function assertMinimalWithheld(payload: Record<string, unknown>, surface: "search" | "quotes") {
  assert.equal(payload.schemaVersion, "velmere.current-execution.real-markets-generic-withheld.v1");
  assert.equal(payload.ok, false);
  assert.equal(payload.mode, "withheld");
  assert.equal(payload.availability, "WITHHELD");
  assert.equal(payload.error, "real_markets_customer_delivery_unavailable");
  assert.equal(payload.surface, surface);
  assert.deepEqual(payload.results, []);
  assert.deepEqual(payload.quotes, []);
  assert.deepEqual(payload.canonicalQuotes, []);
  assert.equal(payload.riskScore, null);
  assert.equal(payload.confidence, null);
  assert.equal(payload.currentness, "UNKNOWN_BLOCKED");
  assert.equal(payload.liveClaimed, false);
  assert.equal(payload.executable, false);
  assert.equal(payload.executableQuoteClaimed, false);
  assert.equal(payload.marketPriceEligible, false);
  assert.equal(payload.customerFinalCredit, false);
  assert.equal(payload.retryAfter, null);
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /Yahoo|Stooq|query1|query2|providerId|providerUses|sourceFamily/iu);
}

async function main() {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  let physicalNetworkCalls = 0;
  globalThis.fetch = (async () => {
    physicalNetworkCalls += 1;
    throw new Error("physical_network_forbidden");
  }) as typeof fetch;
  process.env.NODE_ENV = "test";
  process.env.VERCEL_ENV = "preview";

  try {
    assert.equal(REAL_MARKETS_GENERIC_DELIVERY_POLICY_ID, "velmere.current-execution.real-markets-generic-delivery-policy.v1");

    const searchDecision = buildRealMarketsGenericDeliveryPreflight("search");
    assert.equal(searchDecision.state, "WITHHELD_RIGHTS_UNVERIFIED");
    assert.equal(searchDecision.providerNetworkAllowed, false);
    assert.equal(searchDecision.customerDeliveryAllowed, false);
    assert.equal(searchDecision.liveClaimed, false);
    assert.equal(searchDecision.executableQuoteClaimed, false);
    assert.equal(searchDecision.providerUses.length, 1);
    assert.ok(searchDecision.providerUses.every((provider) => !provider.allowed));
    assert.equal(verifyRealMarketsGenericDeliveryPreflight(searchDecision), true);

    const quoteDecision = buildRealMarketsGenericDeliveryPreflight("quotes");
    assert.equal(quoteDecision.state, "WITHHELD_RIGHTS_UNVERIFIED");
    assert.equal(quoteDecision.providerNetworkAllowed, false);
    assert.equal(quoteDecision.customerDeliveryAllowed, false);
    assert.deepEqual(
      quoteDecision.providerUses.map((provider) => provider.providerId),
      ["yahoo_finance", "stooq", "coingecko", "binance", "mexc", "coinbase", "alpha_vantage"],
    );
    assert.ok(quoteDecision.providerUses.every((provider) => !provider.allowed));
    assert.equal(verifyRealMarketsGenericDeliveryPreflight(quoteDecision), true);

    const unknownFamily = buildRealMarketsGenericDeliveryPreflight("quotes", ["yahoo_finance", "stooq", "attacker_provider"]);
    assert.equal(unknownFamily.providerNetworkAllowed, false);
    assert.equal(unknownFamily.customerDeliveryAllowed, false);
    assert.ok(unknownFamily.blockers.includes("provider_family_set_mismatch"));
    assert.ok(unknownFamily.blockers.includes("unregistered_provider_family:attacker_provider"));

    const missingFamily = buildRealMarketsGenericDeliveryPreflight("quotes", ["yahoo_finance"]);
    assert.equal(missingFamily.providerNetworkAllowed, false);
    assert.ok(missingFamily.blockers.includes("provider_family_set_mismatch"));
    assert.ok(missingFamily.blockers.includes("required_provider_family_missing:stooq"));

    const duplicateAlias = buildRealMarketsGenericDeliveryPreflight("quotes", ["yahoo_finance", "stooq", "stooq"]);
    assert.equal(duplicateAlias.providerNetworkAllowed, false);
    assert.ok(duplicateAlias.blockers.includes("duplicate_provider_family:stooq"));

    const tampered = {
      ...quoteDecision,
      state: "READY" as const,
      providerNetworkAllowed: true,
      customerDeliveryAllowed: true,
    };
    assert.equal(verifyRealMarketsGenericDeliveryPreflight(tampered), false);
    const tamperProjection = projectRealMarketsGenericCustomerDelivery({
      decision: tampered,
      requestedTier: "Advanced",
      payload: {
        ok: true,
        quotes: [{ symbol: "AAPL", price: 999 }],
        canonicalQuotes: [{ symbol: "AAPL", currentPrice: 999 }],
        riskScore: 1,
        confidence: 100,
        liveClaimed: true,
        sourceFamily: "attacker_provider",
      },
    });
    assert.equal(tamperProjection.allowed, false);
    assert.equal(tamperProjection.status, 503);
    assertMinimalWithheld(tamperProjection.payload as unknown as Record<string, unknown>, "quotes");

    const safeSearch = toRealMarketsGenericCustomerSafeWithheld("search", null);
    const safeQuotes = toRealMarketsGenericCustomerSafeWithheld("quotes", "Basic");
    assertMinimalWithheld(safeSearch as unknown as Record<string, unknown>, "search");
    assertMinimalWithheld(safeQuotes as unknown as Record<string, unknown>, "quotes");

    for (const requestUrl of [
      "https://velmere.test/api/market-integrity/real-markets?q=AAPL",
      "https://velmere.test/api/market-integrity/real-markets?q=%27%20OR%201%3D1--",
      "https://velmere.test/api/market-integrity/real-markets?symbols=AAPL&detail=1&tier=basic",
      "https://velmere.test/api/market-integrity/real-markets?symbols=GC%3DF&detail=1&tier=advanced",
      "https://velmere.test/api/market-integrity/real-markets?ids=gold,wti&range=1d",
    ]) {
      const response = await handleRealMarketsGet(new Request(requestUrl));
      assert.equal(response.status, 503, requestUrl);
      assert.equal(response.headers.get("cache-control"), "no-store", requestUrl);
      const payload = await responseJson(response);
      assertMinimalWithheld(payload, new URL(requestUrl).searchParams.has("q") ? "search" : "quotes");
    }
    assert.equal(physicalNetworkCalls, 0, "rights denial must happen before every provider socket");

    const routeSource = await readFile(new URL("../../lib/market-integrity/real-markets-route-orchestrator.ts", import.meta.url), "utf8");
    const searchPreflightIndex = routeSource.indexOf("realMarketsSearchDeliveryPreflight");
    const yahooSearchFetchIndex = routeSource.indexOf("const response = await fetchQuiet");
    const quotePreflightIndex = routeSource.indexOf("realMarketsQuoteDeliveryPreflight");
    const paidAccessIndex = routeSource.indexOf("const paidAccessGate = await resolveVlmPaidSurfaceAccess");
    const quoteFetchIndex = routeSource.indexOf("const quoteSettled = await mapSettledWithConcurrencyLimit");
    const metadataIndex = routeSource.indexOf("loadQuoteMetadata(requested.map");
    const historyIndex = routeSource.indexOf("recordProviderObservation({");
    assert.ok(searchPreflightIndex >= 0 && searchPreflightIndex < yahooSearchFetchIndex);
    assert.ok(quotePreflightIndex >= 0 && quotePreflightIndex < paidAccessIndex);
    assert.ok(quotePreflightIndex >= 0 && quotePreflightIndex < quoteFetchIndex);
    assert.ok(quotePreflightIndex >= 0 && quotePreflightIndex < metadataIndex);
    assert.ok(quotePreflightIndex >= 0 && quotePreflightIndex < historyIndex);
    assert.match(routeSource, /referenceFx/u);
    assert.match(routeSource, /ecb_reference_only/u);
    assert.match(routeSource, /referenceCot/u);
    assert.match(routeSource, /cftc_cot_historical_reference_only/u);
    assert.equal((routeSource.match(/loadCftcCotOfficialReference\(/gu) ?? []).length, 1);

    console.log("PASS Real Markets generic search/quote rights are denied before cache, provider, metadata, history and network without exposing topology");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
