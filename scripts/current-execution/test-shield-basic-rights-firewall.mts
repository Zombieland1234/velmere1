#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { GET as getMarkets } from "../../lib/server/market-integrity-route-modules/markets";
import { GET as getSearch } from "../../lib/server/market-integrity-route-modules/search";
import { GET as getAnalyze } from "../../lib/server/market-integrity-route-modules/analyze";
import {
  handleKlineGet,
  type KlineRouteDependencies,
} from "../../lib/market-integrity/kline-route-handler";
import { parseKlineRequestContract } from "../../lib/market-integrity/kline-asset-identity";
import { buildPass4408AssetDetailChartFetchUrl } from "../../lib/market-integrity/asset-detail-client-helpers";
import {
  buildShieldBasicDeliveryPreflight,
  projectShieldBasicCustomerDelivery,
  type ShieldBasicDeliverySurface,
} from "../../lib/market-integrity/shield-basic-delivery-policy";

const ROOT = process.cwd();
const surfaces = ["markets", "search", "klines", "analyze"] as const satisfies readonly ShieldBasicDeliverySurface[];
const expectedProviderUseCounts: Record<(typeof surfaces)[number], number> = {
  markets: 2,
  search: 1,
  klines: 4,
  analyze: 3,
};
const expectedWithheldKeys = [
  "availability",
  "candles",
  "confidence",
  "currentness",
  "data",
  "error",
  "liveClaimed",
  "mode",
  "reason",
  "retryAfter",
  "riskScore",
  "rows",
  "schemaVersion",
  "suggestions",
  "surface",
].sort();
const forbiddenCustomerKey = /provider|cache|receipt|topology|decision|blocker|source/i;
const checks: Array<{ id: string; passed: true; detail?: unknown }> = [];

function check(value: unknown, id: string, detail?: unknown): asserts value {
  assert.ok(value, id);
  checks.push({ id, passed: true, ...(detail === undefined ? {} : { detail }) });
}

function assertCustomerSafeWithheld(surface: ShieldBasicDeliverySurface, payload: unknown, id: string) {
  check(payload !== null && typeof payload === "object" && !Array.isArray(payload), `${id}.object`);
  const row = payload as Record<string, unknown>;
  assert.deepEqual(Object.keys(row).sort(), expectedWithheldKeys, `${id}.exact-minimal-keyset`);
  checks.push({ id: `${id}.exact-minimal-keyset`, passed: true });
  check(row.surface === surface, `${id}.surface`);
  check(row.availability === "WITHHELD" && row.mode === "withheld", `${id}.withheld-state`);
  check(row.riskScore === null && row.confidence === null, `${id}.null-risk-confidence`);
  check(row.liveClaimed === false, `${id}.no-live-claim`);
  for (const key of ["data", "rows", "suggestions", "candles"] as const) {
    check(Array.isArray(row[key]) && row[key].length === 0, `${id}.${key}-empty`);
  }
  const leakedKeys = Object.keys(row).filter((key) => forbiddenCustomerKey.test(key));
  check(leakedKeys.length === 0, `${id}.no-sensitive-key-leakage`, leakedKeys);
  const serialized = JSON.stringify(row);
  check(!/providerReceipts|providerErrors|snapshotPayloadHash|keyId|upstream|topology|cache/i.test(serialized), `${id}.no-sensitive-value-leakage`);
}

for (const surface of surfaces) {
  const first = buildShieldBasicDeliveryPreflight(surface);
  const second = buildShieldBasicDeliveryPreflight(surface);
  check(first.state === "WITHHELD_RIGHTS_UNVERIFIED", `policy.${surface}.withheld`);
  check(first.providerNetworkAllowed === false, `policy.${surface}.network-denied`);
  check(first.customerDeliveryAllowed === false, `policy.${surface}.delivery-denied`);
  check(first.liveClaimed === false, `policy.${surface}.no-live-claim`);
  check(first.providerUses.length === expectedProviderUseCounts[surface], `policy.${surface}.exact-provider-use-count`);
  check(first.decisionDigest === second.decisionDigest, `policy.${surface}.deterministic`);

  const adversarialPayload = {
    mode: "live_verified",
    riskScore: 97,
    confidence: 99,
    liveClaimed: true,
    rows: [{ secret: "must-not-escape" }],
    candles: [{ close: 1 }],
    providerReceipts: [{ providerId: "hidden-provider", keyId: "secret-key" }],
    providerErrors: ["hidden-topology"],
    cache: { durable: true },
    topology: { upstream: "hidden-upstream" },
  };
  const projected = projectShieldBasicCustomerDelivery({ decision: first, payload: adversarialPayload });
  check(!projected.allowed && projected.status === 503, `projection.${surface}.provider-rich-payload-collapsed`);
  assertCustomerSafeWithheld(surface, projected.payload, `projection.${surface}`);

  const tampered = { ...first, providerNetworkAllowed: true };
  const tamperedProjection = projectShieldBasicCustomerDelivery({ decision: tampered, payload: adversarialPayload });
  check(!tamperedProjection.allowed && tamperedProjection.status === 503, `projection.${surface}.tampered-decision-rejected`);
  assertCustomerSafeWithheld(surface, tamperedProjection.payload, `projection.${surface}.tampered`);

  const invalidSurface = { ...first, surface: "internal-provider-topology" } as unknown as typeof first;
  const invalidSurfaceProjection = projectShieldBasicCustomerDelivery({ decision: invalidSurface, payload: adversarialPayload });
  check(!invalidSurfaceProjection.allowed && invalidSurfaceProjection.status === 503, `projection.${surface}.invalid-surface-rejected`);
}

const chartUrl = buildPass4408AssetDetailChartFetchUrl({
  symbol: "BTC",
  providerSymbol: "BTC",
  marketId: "bitcoin",
  quote: "USD",
  assetClass: "crypto",
  venue: "shield",
}, { realMarketsRange: "15m", shieldRange: "7d" });
const parsedChartUrl = new URL(chartUrl, "http://localhost");
assert.deepEqual(
  Array.from(parsedChartUrl.searchParams.keys()).sort(),
  ["assetClass", "marketId", "quote", "range", "symbol"].sort(),
  "modal.full-canonical-kline-tuple",
);
checks.push({ id: "modal.full-canonical-kline-tuple", passed: true, detail: chartUrl });
const parsedContract = parseKlineRequestContract(parsedChartUrl);
check(parsedContract.ok, "modal.full-tuple-satisfies-server-contract", parsedContract);
if (parsedContract.ok) {
  check(parsedContract.value.identity.marketId === "bitcoin", "modal.market-id-exact");
  check(parsedContract.value.identity.symbol === "BTC", "modal.symbol-exact");
  check(parsedContract.value.identity.quote === "USD", "modal.quote-exact");
}

const source = (relative: string) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const marketsSource = source("lib/server/market-integrity-route-modules/markets.ts");
const searchSource = source("lib/server/market-integrity-route-modules/search.ts");
const klinesSource = source("lib/market-integrity/kline-route-handler.ts");
const analyzeSource = source("lib/server/market-integrity-route-modules/analyze.ts");
const routeRegistrySource = source("lib/server/route-registries/market-integrity.ts");
const routeShellSource = source("app/api/market-integrity/[operation]/route.ts");
const marketsGetBody = marketsSource.slice(marketsSource.indexOf("export async function GET"));
const searchGetBody = searchSource.slice(searchSource.indexOf("export async function GET"));
const klinesGetBody = klinesSource.slice(klinesSource.indexOf("export async function handleKlineGet"));
const analyzeGetBody = analyzeSource.slice(analyzeSource.indexOf("export async function GET"));
check(marketsGetBody.indexOf("buildShieldBasicDeliveryPreflight") < marketsGetBody.indexOf("fetchCoinGeckoMarketsCoalesced"), "ordering.markets.preflight-before-primary-network");
check(marketsGetBody.indexOf("buildShieldBasicDeliveryPreflight") < marketsGetBody.indexOf("readMarketSnapshotWithDurable"), "ordering.markets.preflight-before-cache-read");
check(marketsGetBody.indexOf("buildShieldBasicDeliveryPreflight") < marketsGetBody.indexOf("fetchBinanceMarketFallback"), "ordering.markets.preflight-before-fallback-network");
check(searchGetBody.indexOf("buildShieldBasicDeliveryPreflight") < searchGetBody.indexOf("fetchCoinGeckoSuggestions"), "ordering.search.preflight-before-network");
check(klinesGetBody.indexOf("buildShieldBasicDeliveryPreflight") < klinesGetBody.indexOf("buildLocalDevelopmentKlineReference"), "ordering.klines.preflight-before-reference-or-cache-work");
check(klinesGetBody.indexOf("buildShieldBasicDeliveryPreflight") < klinesGetBody.indexOf("resolveIdentity(requestedIdentity)"), "ordering.klines.preflight-before-identity-network");
check(klinesGetBody.indexOf("buildShieldBasicDeliveryPreflight") < klinesGetBody.indexOf("fetchKlines(resolution.identity"), "ordering.klines.preflight-before-kline-network");
check(analyzeGetBody.indexOf("buildShieldBasicDeliveryPreflight") < analyzeGetBody.indexOf("searchCoinGeckoMarket(query)"), "ordering.analyze.preflight-before-coingecko-network");
check(analyzeGetBody.indexOf("buildShieldBasicDeliveryPreflight") < analyzeGetBody.indexOf("analyzeDexScreenerToken(query)"), "ordering.analyze.preflight-before-dexscreener-network");
check(analyzeGetBody.indexOf("buildShieldBasicDeliveryPreflight") < analyzeGetBody.indexOf("buildDefiLlamaSnapshotForResult"), "ordering.analyze.preflight-before-defillama-network");
check(routeRegistrySource.includes('"analyze": { methods: ["GET"] as const, load: () => import("@/lib/server/market-integrity-route-modules/analyze") }'), "routing.analyze.public-catchall-registry-reachable");
check(routeShellSource.includes("export function GET") && routeShellSource.includes("dispatchLazyRoute"), "routing.analyze.public-catchall-get-dispatch-reachable");
check((marketsSource.match(/shieldJsonNoStore\(shieldRightsPreflight/g) ?? []).length >= 4, "projection.markets.final-boundaries-covered");
check((searchSource.match(/customerJson\(/g) ?? []).length >= 2, "projection.search.final-boundaries-covered");
check((klinesSource.match(/customerKlineResponse\(rightsPreflight/g) ?? []).length >= 7, "projection.klines.final-boundaries-covered");
check((analyzeSource.match(/customerJson\(/g) ?? []).length >= 7, "projection.analyze.final-boundaries-covered");

const previousFetch = globalThis.fetch;
let globalFetchCalls = 0;
let identityCalls = 0;
let klineProviderCalls = 0;
globalThis.fetch = (async () => {
  globalFetchCalls += 1;
  throw new Error("network_must_not_run_while_rights_are_withheld");
}) as typeof fetch;

const resolveIdentity: NonNullable<KlineRouteDependencies["resolveIdentity"]> = async () => {
  identityCalls += 1;
  return { ok: false, code: "identity_provider_unavailable", status: 502, error: "must not run" };
};
const fetchKlines: NonNullable<KlineRouteDependencies["fetchKlines"]> = async () => {
  klineProviderCalls += 1;
  throw new Error("must not run");
};

try {
  const marketsResponse = await getMarkets(new Request(
    "http://localhost/api/market-integrity/markets?page=1&perPage=100&tier=basic",
  ));
  const searchResponse = await getSearch(new Request(
    "http://localhost/api/market-integrity/search?query=bitcoin",
  ));
  const analyzeResponse = await getAnalyze(new Request(
    "http://localhost/api/market-integrity/analyze?query=bitcoin",
  ));
  const klinesResponse = await handleKlineGet(new Request(
    "http://localhost/api/market-integrity/klines?assetClass=crypto&marketId=bitcoin&symbol=BTC&quote=USD&range=7d",
  ), { resolveIdentity, fetchKlines });

  check(marketsResponse.status === 503, "runtime.markets.withheld-status");
  check(searchResponse.status === 503, "runtime.search.withheld-status");
  check(analyzeResponse.status === 503, "runtime.analyze.withheld-status");
  check(klinesResponse.status === 503, "runtime.klines.withheld-status");
  assertCustomerSafeWithheld("markets", await marketsResponse.json(), "runtime.markets");
  assertCustomerSafeWithheld("search", await searchResponse.json(), "runtime.search");
  assertCustomerSafeWithheld("analyze", await analyzeResponse.json(), "runtime.analyze");
  assertCustomerSafeWithheld("klines", await klinesResponse.json(), "runtime.klines");
  check(globalFetchCalls === 0, "runtime.all-provider-network-call-count-zero", globalFetchCalls);
  check(identityCalls === 0, "runtime.kline-identity-provider-call-count-zero", identityCalls);
  check(klineProviderCalls === 0, "runtime.kline-ohlc-provider-call-count-zero", klineProviderCalls);
} finally {
  globalThis.fetch = previousFetch;
}

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.shield-basic-rights-firewall-test.v1",
  status: "PASS",
  checks: checks.length,
  passed: checks.length,
  failed: 0,
  providerNetworkCalls: globalFetchCalls + identityCalls + klineProviderCalls,
  customerFinalCredit: false,
  checkpointPromoted: false,
  rightsState: "WITHHELD_UNVERIFIED",
  liveClaimed: false,
  results: checks,
}, null, 2));
