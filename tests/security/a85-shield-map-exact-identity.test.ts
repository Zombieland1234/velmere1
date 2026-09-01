import assert from "node:assert/strict";

import {
  createPass4644ProviderEvidenceReceipt,
} from "../../lib/market-integrity/provider-evidence-receipt.ts";
import type {
  Pass4644ProviderEvidenceReceipt,
} from "../../lib/market-integrity/provider-evidence-receipt.ts";
import type { TokenRiskResult } from "../../lib/market-integrity/risk-types.ts";
import {
  parseShieldMapQuery,
  verifyShieldMapResolvedIdentity,
} from "../../lib/market-integrity/shield-map-query-boundary.ts";
import {
  buildShieldMapIdentityBoundResponse,
  resolveShieldMapResult,
} from "../../lib/server/market-integrity-route-modules/investigator.ts";
import type {
  ShieldMapIdentityBoundEffects,
  ShieldMapResolutionProviders,
} from "../../lib/server/market-integrity-route-modules/investigator.ts";

const NOW = new Date("2026-07-29T10:00:10.000Z");
const RECEIVED_AT = "2026-07-29T10:00:00.000Z";
const OBSERVED_AT = "2026-07-29T09:59:59.000Z";

function parsed(query: string) {
  const result = parseShieldMapQuery(
    new URL(`https://velmere.local/api/market-integrity/investigator?query=${query}&locale=en`),
  );
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  return result.value;
}

function marketReceipt(args: {
  requested?: string;
  marketId?: string;
  symbol?: string;
  price?: number;
  receivedAt?: string;
  observedAt?: string;
  ttlMs?: number;
  variant?: string;
} = {}) {
  const requested = args.requested ?? "bitcoin";
  const marketId = args.marketId ?? "bitcoin";
  const symbol = args.symbol ?? "BTC";
  const price = args.price ?? 60_000;
  return createPass4644ProviderEvidenceReceipt({
    providerId: "coingecko",
    providerFamily: "market_data",
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: requested,
    resolvedMarketId: marketId,
    resolvedSymbol: symbol,
    identityMatched: true,
    capabilities: ["identity", "price"],
    timestampProvenance: "provider",
    observedAt: args.observedAt ?? OBSERVED_AT,
    receivedAt: args.receivedAt ?? RECEIVED_AT,
    ttlMs: args.ttlMs ?? 60_000,
    httpStatus: 200,
    latencyMs: 5,
    normalizedPayload: {
      id: marketId,
      symbol,
      price,
      ...(args.variant ? { variant: args.variant } : {}),
    },
  });
}

function addressReceipt(args: {
  requested: string;
  address?: string;
  chainId?: string;
  symbol?: string;
  priceUsd?: string;
}) {
  const address = args.address ?? args.requested;
  const chainId = args.chainId ?? "ethereum";
  const symbol = args.symbol ?? "TOK";
  const priceUsd = args.priceUsd ?? "1.25";
  return createPass4644ProviderEvidenceReceipt({
    providerId: "dexscreener",
    providerFamily: "dex_market",
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: args.requested,
    resolvedAddress: address,
    resolvedChainId: chainId,
    resolvedSymbol: symbol,
    identityMatched: true,
    capabilities: ["pair_identity", "price"],
    timestampProvenance: "transport_received",
    observedAt: RECEIVED_AT,
    receivedAt: RECEIVED_AT,
    ttlMs: 60_000,
    httpStatus: 200,
    latencyMs: 7,
    normalizedPayload: {
      tokenAddress: address,
      chainId,
      symbol,
      priceUsd,
    },
  });
}

function catalogReceipt() {
  return createPass4644ProviderEvidenceReceipt({
    providerId: "coingecko",
    providerFamily: "market_data",
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: "bitcoin",
    resolvedMarketId: "bitcoin",
    resolvedSymbol: "BTC",
    identityMatched: true,
    capabilities: ["identity", "price"],
    timestampProvenance: "provider",
    observedAt: OBSERVED_AT,
    receivedAt: RECEIVED_AT,
    ttlMs: 60_000,
    httpStatus: 200,
    latencyMs: 5,
    normalizedPayload: {
      identity: { marketId: "bitcoin", symbol: "BTC" },
      market: { price: 60_000 },
    },
  });
}

function marketResult(
  receipts: Pass4644ProviderEvidenceReceipt[],
  args: { marketId?: string; symbol?: string; price?: number } = {},
): TokenRiskResult {
  const marketId = args.marketId ?? "bitcoin";
  const symbol = args.symbol ?? "BTC";
  return {
    token: { marketId, symbol, name: symbol },
    score: 0,
    level: "low",
    badge: "low_detected_risk",
    signals: [],
    metrics: { currentPrice: args.price ?? 60_000 },
    dataQuality: "live",
    dataSources: ["coingecko"],
    providerEvidenceReceipts: receipts,
    generatedAt: NOW.toISOString(),
  };
}

function addressResult(
  receipt: Pass4644ProviderEvidenceReceipt,
  args: { address: string; chainId?: string; symbol?: string; price?: number },
): TokenRiskResult {
  const symbol = args.symbol ?? "TOK";
  return {
    token: {
      symbol,
      name: symbol,
      tokenAddress: args.address,
      chainId: args.chainId ?? "ethereum",
    },
    score: 0,
    level: "low",
    badge: "low_detected_risk",
    signals: [],
    metrics: { currentPrice: args.price ?? 1.25 },
    dataQuality: "live",
    dataSources: ["dexscreener"],
    providerEvidenceReceipts: [receipt],
    generatedAt: NOW.toISOString(),
  };
}

const bitcoinQuery = parsed("bitcoin");
const bitcoinResult = marketResult([catalogReceipt(), marketReceipt()]);
const bitcoinBinding = verifyShieldMapResolvedIdentity(
  bitcoinQuery,
  bitcoinResult,
  { now: NOW },
);
assert.equal(bitcoinBinding.ok, true);
assert.equal(bitcoinBinding.ok && bitcoinBinding.requested, "bitcoin");
assert.equal(bitcoinBinding.ok && bitcoinBinding.resolvedMarketId, "bitcoin");
assert.equal(bitcoinBinding.ok && bitcoinBinding.resolvedSymbol, "BTC");
assert.equal(bitcoinBinding.ok && bitcoinBinding.resolvedQuote, "USD");

const btcQuery = parsed("BTC");
const btcBinding = verifyShieldMapResolvedIdentity(
  btcQuery,
  marketResult([marketReceipt({ requested: "BTC" })]),
  { now: NOW },
);
assert.equal(btcBinding.ok, true);

const crossQuerySubstitution = verifyShieldMapResolvedIdentity(
  btcQuery,
  marketResult([
    marketReceipt({
      requested: "ETH",
      marketId: "ethereum",
      symbol: "ETH",
      price: 3_000,
    }),
  ], { marketId: "ethereum", symbol: "ETH", price: 3_000 }),
  { now: NOW },
);
assert.deepEqual(crossQuerySubstitution, {
  ok: false,
  code: "shield_map_identity_query_mismatch",
});

const ambiguous = verifyShieldMapResolvedIdentity(
  bitcoinQuery,
  marketResult([
    marketReceipt({ variant: "first" }),
    marketReceipt({ variant: "second" }),
  ]),
  { now: NOW },
);
assert.deepEqual(ambiguous, {
  ok: false,
  code: "shield_map_identity_ambiguous",
});

const stale = verifyShieldMapResolvedIdentity(
  bitcoinQuery,
  marketResult([
    marketReceipt({
      observedAt: "2026-07-29T08:59:59.000Z",
      receivedAt: "2026-07-29T09:00:00.000Z",
      ttlMs: 5_000,
    }),
  ]),
  { now: NOW },
);
assert.deepEqual(stale, {
  ok: false,
  code: "shield_map_identity_stale",
});

const resolvedIdentityConflict = verifyShieldMapResolvedIdentity(
  bitcoinQuery,
  marketResult([
    marketReceipt({ symbol: "XBT" }),
  ]),
  { now: NOW },
);
assert.deepEqual(resolvedIdentityConflict, {
  ok: false,
  code: "shield_map_identity_conflict",
});

const quoteValueConflict = verifyShieldMapResolvedIdentity(
  bitcoinQuery,
  marketResult([
    marketReceipt({ price: 59_999 }),
  ]),
  { now: NOW },
);
assert.deepEqual(quoteValueConflict, {
  ok: false,
  code: "shield_map_identity_conflict",
});

const tamperedReceipt = marketReceipt();
tamperedReceipt.identity.requested = "ethereum";
assert.deepEqual(
  verifyShieldMapResolvedIdentity(
    bitcoinQuery,
    marketResult([tamperedReceipt]),
    { now: NOW },
  ),
  { ok: false, code: "shield_map_identity_unverified" },
);

const address = "0x00000000000000000000000000000000000000aa";
const addressQuery = parsed(address);
const exactAddressReceipt = addressReceipt({ requested: address });
const addressBinding = verifyShieldMapResolvedIdentity(
  addressQuery,
  addressResult(exactAddressReceipt, { address }),
  { now: NOW },
);
assert.equal(addressBinding.ok, true);
assert.equal(addressBinding.ok && addressBinding.resolvedAddress, address);
assert.equal(addressBinding.ok && addressBinding.resolvedChainId, "ethereum");
assert.equal(addressBinding.ok && addressBinding.resolvedQuote, "USD");

const addressQuoteConflict = verifyShieldMapResolvedIdentity(
  addressQuery,
  addressResult(
    addressReceipt({ requested: address, priceUsd: "1.24" }),
    { address, price: 1.25 },
  ),
  { now: NOW },
);
assert.deepEqual(addressQuoteConflict, {
  ok: false,
  code: "shield_map_identity_conflict",
});

const otherAddress = "0x00000000000000000000000000000000000000bb";
const addressCrossQuerySubstitution = verifyShieldMapResolvedIdentity(
  addressQuery,
  addressResult(
    addressReceipt({ requested: otherAddress }),
    { address: otherAddress },
  ),
  { now: NOW },
);
assert.deepEqual(addressCrossQuerySubstitution, {
  ok: false,
  code: "shield_map_identity_query_mismatch",
});

assert.equal(
  parseShieldMapQuery(
    new URL("https://velmere.local/api/market-integrity/investigator?query=%D0%92TC&locale=en"),
  ).ok,
  false,
);
assert.equal(
  parseShieldMapQuery(
    new URL("https://velmere.local/api/market-integrity/investigator?query=%EF%BC%A2TC&locale=en"),
  ).ok,
  false,
);
assert.equal(
  parseShieldMapQuery(
    new URL("https://velmere.local/api/market-integrity/investigator?query=%2542TC&locale=en"),
  ).ok,
  false,
);
assert.equal(
  parseShieldMapQuery(
    new URL("https://velmere.local/api/market-integrity/investigator?query=%0ABTC&locale=en"),
  ).ok,
  false,
);
assert.equal(
  parseShieldMapQuery(
    new URL("https://velmere.local/api/market-integrity/investigator?query=%42TC&locale=en"),
  ).ok,
  true,
);

const resolutionProviderCalls = { market: 0, address: 0 };
const substitutedMarketResult = marketResult([
  marketReceipt({
    requested: "ETH",
    marketId: "ethereum",
    symbol: "ETH",
    price: 3_000,
  }),
], { marketId: "ethereum", symbol: "ETH", price: 3_000 });
const resolutionProviders = {
  searchMarket: async () => {
    resolutionProviderCalls.market += 1;
    return { result: substitutedMarketResult };
  },
  analyzeAddress: async () => {
    resolutionProviderCalls.address += 1;
    throw new Error("alternate_provider_must_not_run_after_identity_rejection");
  },
} as unknown as ShieldMapResolutionProviders;
const deniedResolution = await resolveShieldMapResult({
  query: btcQuery,
  now: NOW,
  providers: resolutionProviders,
});
assert.deepEqual(deniedResolution, {
  ok: false,
  code: "shield_map_identity_query_mismatch",
});
assert.deepEqual(resolutionProviderCalls, { market: 1, address: 0 });

const deniedEffectCalls = {
  publication: 0,
  history: 0,
  investigator: 0,
  report: 0,
  persistence: 0,
};
const deniedEffects = {
  enforcePublicationTruth: () => {
    deniedEffectCalls.publication += 1;
    throw new Error("publication_effect_must_not_run");
  },
  getHistory: async () => {
    deniedEffectCalls.history += 1;
    throw new Error("history_effect_must_not_run");
  },
  buildInvestigator: () => {
    deniedEffectCalls.investigator += 1;
    throw new Error("investigator_effect_must_not_run");
  },
  buildEvidenceReport: () => {
    deniedEffectCalls.report += 1;
    throw new Error("report_effect_must_not_run");
  },
  persistSnapshot: async () => {
    deniedEffectCalls.persistence += 1;
    throw new Error("persistence_effect_must_not_run");
  },
} as unknown as ShieldMapIdentityBoundEffects;

const deniedResponse = await buildShieldMapIdentityBoundResponse({
  query: btcQuery,
  locale: "en",
  result: marketResult([
    marketReceipt({
      requested: "ETH",
      marketId: "ethereum",
      symbol: "ETH",
      price: 3_000,
    }),
  ], { marketId: "ethereum", symbol: "ETH", price: 3_000 }),
  headers: { "x-test-boundary": "a85" },
  rateLimit: { remaining: 29, resetAt: NOW.toISOString() },
  now: NOW,
  effects: deniedEffects,
});
assert.equal(deniedResponse.status, 409);
assert.deepEqual(await deniedResponse.json(), {
  mode: "error",
  error: "shield_map_identity_query_mismatch",
});
assert.deepEqual(deniedEffectCalls, {
  publication: 0,
  history: 0,
  investigator: 0,
  report: 0,
  persistence: 0,
});

const withheldEffectCalls = {
  publication: 0,
  history: 0,
  investigator: 0,
  report: 0,
  persistence: 0,
};
const withheldEffects = {
  enforcePublicationTruth: () => {
    withheldEffectCalls.publication += 1;
    return {
      mode: "withheld",
      evidenceState: "withheld",
      scorePublished: false,
      blockers: ["source_receipt_missing"],
    };
  },
  getHistory: async () => {
    withheldEffectCalls.history += 1;
    return [];
  },
  buildInvestigator: () => {
    withheldEffectCalls.investigator += 1;
    return { lanes: [] };
  },
  buildEvidenceReport: () => {
    withheldEffectCalls.report += 1;
    return { sections: [] };
  },
  persistSnapshot: async () => {
    withheldEffectCalls.persistence += 1;
    return { durable: false };
  },
} as unknown as ShieldMapIdentityBoundEffects;

const withheldResponse = await buildShieldMapIdentityBoundResponse({
  query: bitcoinQuery,
  locale: "en",
  result: bitcoinResult,
  headers: { "x-test-boundary": "a85" },
  rateLimit: { remaining: 29, resetAt: NOW.toISOString() },
  now: NOW,
  effects: withheldEffects,
});
assert.equal(withheldResponse.status, 424);
const withheldPayload = await withheldResponse.json();
assert.equal(withheldPayload.mode, "withheld");
assert.equal(withheldPayload.error, "shield_map_publication_withheld");
assert.equal("investigator" in withheldPayload, false);
assert.equal("evidenceReport" in withheldPayload, false);
assert.equal("sourceSnapshot" in withheldPayload, false);
assert.equal("result" in withheldPayload, false);
assert.deepEqual(withheldEffectCalls, {
  publication: 1,
  history: 0,
  investigator: 0,
  report: 0,
  persistence: 0,
});

const allowedEffectCalls = {
  publication: 0,
  history: 0,
  investigator: 0,
  report: 0,
  persistence: 0,
};
const allowedEffects = {
  enforcePublicationTruth: () => {
    allowedEffectCalls.publication += 1;
    return {
      mode: "live",
      evidenceState: "verified",
      scorePublished: true,
      blockers: [],
    };
  },
  getHistory: async () => {
    allowedEffectCalls.history += 1;
    return [];
  },
  buildInvestigator: () => {
    allowedEffectCalls.investigator += 1;
    return { lanes: [] };
  },
  buildEvidenceReport: () => {
    allowedEffectCalls.report += 1;
    return { sections: [] };
  },
  persistSnapshot: async () => {
    allowedEffectCalls.persistence += 1;
    return { durable: false };
  },
} as unknown as ShieldMapIdentityBoundEffects;

const allowedResponse = await buildShieldMapIdentityBoundResponse({
  query: bitcoinQuery,
  locale: "en",
  result: bitcoinResult,
  headers: { "x-test-boundary": "a85" },
  rateLimit: { remaining: 29, resetAt: NOW.toISOString() },
  now: NOW,
  effects: allowedEffects,
});
assert.equal(allowedResponse.status, 200);
const allowedPayload = await allowedResponse.json();
assert.equal(allowedPayload.identityBinding.requested, "bitcoin");
assert.equal(allowedPayload.identityBinding.resolvedMarketId, "bitcoin");
assert.equal(allowedPayload.identityBinding.resolvedSymbol, "BTC");
assert.equal(allowedPayload.identityBinding.resolvedQuote, "USD");
assert.deepEqual(allowedEffectCalls, {
  publication: 1,
  history: 1,
  investigator: 1,
  report: 1,
  persistence: 1,
});

console.log(JSON.stringify({
  status: "PASS_A85_EXACT_IDENTITY_HANDLER_BOUNDARY",
  exactMarket: true,
  exactAddress: true,
  crossQuerySubstitutionRejected: true,
  ambiguityRejected: true,
  staleRejected: true,
  conflictRejected: true,
  quoteBound: true,
  homoglyphRejected: true,
  doubleEncodingRejected: true,
  alternateProviderCallsAfterIdentityRejection: resolutionProviderCalls.address,
  deniedDownstreamCalls: Object.values(deniedEffectCalls).reduce((sum, value) => sum + value, 0),
  withheldDownstreamCalls: Object.values(withheldEffectCalls).reduce((sum, value) => sum + value, 0),
  allowedDownstreamCalls: Object.values(allowedEffectCalls).reduce((sum, value) => sum + value, 0),
}, null, 2));
