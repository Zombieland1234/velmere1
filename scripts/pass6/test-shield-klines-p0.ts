import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalKlineIdentityDigest,
  parseKlineRequestContract,
  resolveKlineAssetIdentity,
  type KlineAssetIdentity,
} from "../../lib/market-integrity/kline-asset-identity";
import {
  assessKlineSeriesQuality,
  buildKlineBarConsensus,
  type KlineSeriesQuality,
} from "../../lib/market-integrity/verified-kline-quality";
import {
  classifyKlineDelivery,
  fetchVerifiedKlines,
  type VerifiedKlineProviderReceipt,
} from "../../lib/market-integrity/verified-kline-providers";
import {
  persistKlineSnapshot,
  readKlineSnapshot,
} from "../../lib/market-integrity/kline-snapshot-cache";
import { applyDurableRateLimit } from "../../lib/security/durable-rate-limit";
import { GET as klineGet } from "@/lib/server/market-integrity-route-modules/klines";
import { handleKlineGet } from "../../lib/market-integrity/kline-route-handler";

const PASS_ID = "PASS6_SHIELD_KLINES_P0";
let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}

const IDENTITY: KlineAssetIdentity = {
  assetClass: "crypto",
  marketId: "bitcoin",
  symbol: "BTC",
  quote: "USD",
  chainId: null,
  address: null,
};
const IDENTITY_DIGEST = canonicalKlineIdentityDigest(IDENTITY);

function candle(timestamp: number, close: number) {
  return { timestamp, open: close, high: close + 1, low: close - 1, close, volume: 1_000 };
}

function receipt(
  provider: "kraken" | "coinbase",
  quality: KlineSeriesQuality,
  observedAt: string,
): VerifiedKlineProviderReceipt {
  return {
    provider,
    ok: true,
    source: provider,
    pair: provider === "kraken" ? "XBTUSD" : "BTC-USD",
    bars: quality.closedBars,
    latestTimestamp: quality.latestClosedTimestamp ?? undefined,
    latestClose: 100,
    latencyMs: 10,
    qualityScore: quality.qualityScore,
    qualityState: quality.state,
    coveragePercent: quality.coveragePercent,
    gapCount: quality.gapCount,
    staleIntervals: quality.staleIntervals,
    seriesDigest: quality.seriesDigest,
    pages: 1,
    sourceObservedAt: observedAt,
    receivedAt: observedAt,
    identityDigest: IDENTITY_DIGEST,
    requestedIdentity: { ...IDENTITY },
    resolvedIdentity: {
      ...IDENTITY,
      pair: provider === "kraken" ? "XBTUSD" : "BTC-USD",
    },
    identityMatched: true,
  };
}

async function main() {
  const validUrl = new URL("http://localhost/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USD&range=15m");
  const valid = parseKlineRequestContract(validUrl);
  check(valid.ok, "canonical identity tuple is accepted");
  check(valid.ok && valid.value.identity.marketId === "bitcoin" && valid.value.identity.quote === "USD", "marketId and exact quote are retained");
  check(!parseKlineRequestContract(new URL("http://localhost/api/market-integrity/klines?symbol=BTC&range=15m")).ok, "symbol-only request is rejected");
  check(!parseKlineRequestContract(new URL("http://localhost/api/market-integrity/klines?symbol=BTC&symbol=ETH&assetClass=crypto&marketId=bitcoin&quote=USD&range=15m")).ok, "duplicate identity parameters are rejected");
  check(!parseKlineRequestContract(new URL("http://localhost/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USDT&range=15m")).ok, "USD cannot be silently downgraded to USDT");
  check(!parseKlineRequestContract(new URL("http://localhost/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USD&range=15m&debug=1")).ok, "unknown parameters are rejected");
  check(!parseKlineRequestContract(new URL("http://localhost/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USD&range=15m&address=0xabc")).ok, "address without chain is rejected");

  const identityFetch: typeof fetch = async () => new Response(JSON.stringify([{
    id: "bitcoin",
    symbol: "btc",
    last_updated: "2026-07-18T10:00:00.000Z",
  }]), { status: 200, headers: { "content-type": "application/json" } });
  const resolved = await resolveKlineAssetIdentity(IDENTITY, {
    fetchImpl: identityFetch,
    now: new Date("2026-07-18T10:00:03.000Z"),
  });
  check(resolved.ok && resolved.identity.exactMatch, "marketId and symbol resolve to one exact server identity");
  check(resolved.ok && resolved.identity.providerObservedAt === "2026-07-18T10:00:00.000Z", "provider timestamp is preserved");
  check(resolved.ok && resolved.identity.receivedAt === "2026-07-18T10:00:03.000Z", "receivedAt remains separate from provider time");
  check(resolved.ok && resolved.identity.identityDigest === canonicalKlineIdentityDigest(IDENTITY), "resolved identity carries canonical digest");
  const mismatched = await resolveKlineAssetIdentity({ ...IDENTITY, symbol: "ETH" }, { fetchImpl: identityFetch });
  check(!mismatched.ok && mismatched.code === "identity_ambiguous" && mismatched.status === 409, "ticker/marketId mismatch fails closed as ambiguity");
  const unmappedCollision = await resolveKlineAssetIdentity({ ...IDENTITY, marketId: "wrapped-bitcoin" }, { fetchImpl: identityFetch });
  check(!unmappedCollision.ok && unmappedCollision.code === "identity_ambiguous", "same-ticker asset without server venue mapping cannot reach providers");

  const nowMs = Date.UTC(2026, 6, 18, 12, 0, 0);
  const intervalMs = 15 * 60_000;
  const firstSeries = Array.from({ length: 1_200 }, (_, index) => candle(nowMs - (1_200 - index) * intervalMs, 100 + index * 0.001));
  const secondSeries = firstSeries.map((row) => ({ ...row, open: row.open * 1.001, high: row.high * 1.001, low: row.low * 1.001, close: row.close * 1.001 }));
  const first = assessKlineSeriesQuality({ rawCandles: firstSeries, range: "15m", nowMs });
  const second = assessKlineSeriesQuality({ rawCandles: secondSeries, range: "15m", nowMs });
  check([first.quality.state, second.quality.state].every((state) => state === "good" || state === "excellent"), "fixtures meet good/excellent quality");
  const consensus = buildKlineBarConsensus({
    range: "15m",
    series: [
      { provider: "kraken", ...first },
      { provider: "coinbase", ...second },
    ],
  });
  check(consensus.state === "corroborated", "small exact-USD venue spread is corroborated");
  const observedAt = new Date(nowMs).toISOString();
  const receipts = [receipt("kraken", first.quality, observedAt), receipt("coinbase", second.quality, observedAt)];
  const verified = classifyKlineDelivery({ identityExact: true, expectedIdentityDigest: IDENTITY_DIGEST, providerReceipts: receipts, consensus, selectedQuality: first.quality, range: "15m", nowMs });
  check(verified.state === "live_verified" && !verified.withholdCandles, "only exact, fresh, good two-provider consensus becomes live_verified");
  check(verified.independentProviderCount === 2 && verified.goodProviderCount === 2 && verified.freshProviderCount === 2, "LIVE gate exposes exact quorum denominators");
  const mismatchedReceipt = {
    ...receipts[1],
    resolvedIdentity: { ...receipts[1].resolvedIdentity!, marketId: "wrapped-bitcoin" },
  };
  const providerIdentityConflict = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: [receipts[0], mismatchedReceipt],
    consensus,
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(
    providerIdentityConflict.state === "conflict" && providerIdentityConflict.blockers.includes("provider_identity_mismatch"),
    "a provider receipt cannot self-assert a mismatched asset into the exact-identity quorum",
  );

  const singleConsensus = buildKlineBarConsensus({ range: "15m", series: [{ provider: "kraken", ...first }] });
  const single = classifyKlineDelivery({ identityExact: true, expectedIdentityDigest: IDENTITY_DIGEST, providerReceipts: receipts.slice(0, 1), consensus: singleConsensus, selectedQuality: first.quality, range: "15m", nowMs });
  check(single.state === "live_partial" && single.blockers.includes("provider_quorum:1/2"), "single provider is partial, never verified LIVE");
  const limited = classifyKlineDelivery({ identityExact: true, expectedIdentityDigest: IDENTITY_DIGEST, providerReceipts: receipts, consensus, selectedQuality: { ...first.quality, state: "limited" }, range: "15m", nowMs });
  check(limited.state === "live_partial" && limited.blockers.includes("selected_quality:limited"), "limited quality is partial");
  const shallow = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: receipts,
    consensus: { ...consensus, comparedBars: 1 },
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(shallow.state === "live_partial" && shallow.blockers.some((blocker) => blocker.startsWith("consensus_depth:")), "one overlapping bar cannot satisfy consensus depth");
  const duplicateProvider = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: [receipts[0], { ...receipts[0] }],
    consensus,
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(duplicateProvider.state === "live_partial" && duplicateProvider.independentProviderCount === 1, "duplicate provider receipts cannot pad quorum");
  const staleAt = new Date(nowMs - 10 * intervalMs).toISOString();
  const staleReceipts = [receipt("kraken", first.quality, staleAt), receipt("coinbase", second.quality, staleAt)];
  const stale = classifyKlineDelivery({ identityExact: true, expectedIdentityDigest: IDENTITY_DIGEST, providerReceipts: staleReceipts, consensus, selectedQuality: first.quality, range: "15m", nowMs });
  check(stale.state === "live_partial" && stale.freshProviderCount === 0, "stale provider time cannot claim verified LIVE");

  const divergentSeries = firstSeries.map((row) => ({ ...row, open: row.open * 1.1, high: row.high * 1.1, low: row.low * 1.1, close: row.close * 1.1 }));
  const divergentQuality = assessKlineSeriesQuality({ rawCandles: divergentSeries, range: "15m", nowMs });
  const divergentConsensus = buildKlineBarConsensus({
    range: "15m",
    series: [
      { provider: "kraken", ...first },
      { provider: "coinbase", ...divergentQuality },
    ],
  });
  const conflict = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: [receipt("kraken", first.quality, observedAt), receipt("coinbase", divergentQuality.quality, observedAt)],
    consensus: divergentConsensus,
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(conflict.state === "conflict" && conflict.withholdCandles, "material cross-provider divergence is withheld");
  const latestConflict = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: receipts,
    consensus: { ...consensus, latestCloseSpreadPct: 10 },
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(latestConflict.state === "conflict" && latestConflict.blockers.includes("latest_close_divergence"), "latest close divergence is withheld even if historical aggregate was corroborated");
  const identityConflict = classifyKlineDelivery({ identityExact: false, expectedIdentityDigest: IDENTITY_DIGEST, providerReceipts: receipts, consensus, selectedQuality: first.quality, range: "15m", nowMs });
  check(identityConflict.state === "conflict" && identityConflict.withholdCandles, "non-exact identity is withheld");
  const futureAt = new Date(nowMs + 60_000).toISOString();
  const futureConflict = classifyKlineDelivery({
    identityExact: true,
    expectedIdentityDigest: IDENTITY_DIGEST,
    providerReceipts: [receipt("kraken", first.quality, futureAt), receipt("coinbase", second.quality, futureAt)],
    consensus,
    selectedQuality: first.quality,
    range: "15m",
    nowMs,
  });
  check(futureConflict.state === "conflict" && futureConflict.blockers.includes("provider_timestamp_in_future"), "future source timestamps fail closed");

  const originalCurrent = process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT;
  const originalPrevious = process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS;
  const originalNodeEnv = process.env.NODE_ENV;
  const cacheKey = "__velmereKlineSnapshotCachePass6";
  const cacheObservedAt = new Date().toISOString();
  const cacheNowMs = Date.parse(cacheObservedAt);
  const cacheCandles = Array.from({ length: 1_200 }, (_, index) =>
    candle(cacheNowMs - (1_200 - index) * intervalMs, 100 + index * 0.001));
  const input = {
    assetIdentity: IDENTITY,
    pair: "XBTUSD",
    range: "15m",
    source: "Kraken + Coinbase exact USD",
    generatedAt: cacheObservedAt,
    receivedAt: cacheObservedAt,
    sourceObservations: receipts.map((row) => ({ provider: row.provider, observedAt: cacheObservedAt, receivedAt: cacheObservedAt })),
    latestClosedAt: cacheObservedAt,
    ttlMs: 2 * 60 * 60 * 1000,
    candles: cacheCandles,
  };
  try {
    process.env.NODE_ENV = "test";
    process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT = "pass6-cache-key-a-that-is-at-least-thirty-two-bytes";
    delete process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS;
    delete (globalThis as Record<string, unknown>)[cacheKey];
    const persisted = await persistKlineSnapshot(input);
    check(persisted.stored && persisted.integrityMode === "hmac_sha256" && persisted.payloadMac.length === 64, "LKG is HMAC-protected with a server key");
    const wrongQuoteSnapshot = await persistKlineSnapshot({ ...input, pair: "BTCUSDT" });
    check(!wrongQuoteSnapshot.stored, "an exact-USD identity cannot persist a USDT snapshot pair");
    const invalidObservationOrder = await persistKlineSnapshot({
      ...input,
      sourceObservations: [
        ...input.sourceObservations.slice(0, 1),
        { provider: "coinbase", observedAt: new Date(cacheNowMs + 60_000).toISOString(), receivedAt: cacheObservedAt },
      ],
    });
    check(!invalidObservationOrder.stored, "provider observation time after receipt time is rejected");
    const cached = readKlineSnapshot({ assetIdentity: IDENTITY, range: "15m", maxAgeMs: 2 * 60 * 60 * 1000 });
    check(cached !== null, "fresh HMAC snapshot can be read");
    if (!cached) throw new Error("fresh HMAC snapshot unexpectedly unavailable");
    check(cached.ageMs === Math.max(cached.storedAgeMs, cached.sourceAgeMs, cached.candleAgeMs), "LKG age is the worst stored/source/candle age");
    check(readKlineSnapshot({ assetIdentity: { ...IDENTITY, marketId: "wrapped-bitcoin" }, range: "15m" }) === null, "canonical identity prevents ticker cache collision");

    process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS = process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT;
    process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT = "pass6-cache-key-b-that-is-at-least-thirty-two-bytes";
    check(readKlineSnapshot({ assetIdentity: IDENTITY, range: "15m" }) !== null, "rotated previous HMAC key verifies an existing snapshot");
    delete process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS;
    check(readKlineSnapshot({ assetIdentity: IDENTITY, range: "15m" }) === null, "snapshot fails closed when no configured key verifies its MAC");

    delete (globalThis as Record<string, unknown>)[cacheKey];
    delete process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT;
    process.env.NODE_ENV = "production";
    const productionRejected = await persistKlineSnapshot(input);
    check(!productionRejected.stored && productionRejected.integrityMode === "unavailable", "production refuses unsigned LKG persistence");
  } finally {
    if (originalCurrent === undefined) delete process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT;
    else process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_CURRENT = originalCurrent;
    if (originalPrevious === undefined) delete process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS;
    else process.env.VELMERE_KLINE_SNAPSHOT_HMAC_KEY_PREVIOUS = originalPrevious;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    delete (globalThis as Record<string, unknown>)[cacheKey];
  }

  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalRequire = process.env.VELMERE_REQUIRE_DURABLE_RATE_LIMIT;
  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = "production";
    const durableMissing = await applyDurableRateLimit({ key: "shield-klines-p0", limit: 1, windowMs: 60_000 });
    check(!durableMissing.ok && durableMissing.mode === "unavailable" && durableMissing.reason === "rate_limit_store_unavailable", "production distributed limiter fails closed when durable storage is absent");
  } finally {
    if (originalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    if (originalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    if (originalRequire === undefined) delete process.env.VELMERE_REQUIRE_DURABLE_RATE_LIMIT;
    else process.env.VELMERE_REQUIRE_DURABLE_RATE_LIMIT = originalRequire;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }

  const routeOriginalFetch = globalThis.fetch;
  const routeOriginalNodeEnv = process.env.NODE_ENV;
  const routeOriginalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const routeOriginalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const routeOriginalSupabaseUrl = process.env.SUPABASE_URL;
  const routeOriginalPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const routeOriginalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let providerMode: "verified" | "partial" | "conflict" = "verified";
  const routeProviderNowMs = Math.floor(Date.now() / intervalMs) * intervalMs;
  try {
    process.env.NODE_ENV = "test";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      const providerNowMs = routeProviderNowMs;
      const rows = Array.from({ length: 221 }, (_, index) =>
        candle(providerNowMs - (221 - index) * intervalMs, 100 + index * 0.001));
      if (url.pathname.endsWith("/coins/markets")) {
        return new Response(JSON.stringify([{
          id: "bitcoin",
          symbol: "btc",
          last_updated: new Date(providerNowMs - 1_000).toISOString(),
        }]), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.hostname === "api.kraken.com") {
        const krakenRows = rows.map((row) => [
          row.timestamp / 1_000,
          String(row.open),
          String(row.high),
          String(row.low),
          String(row.close),
          String(row.close),
          String(row.volume),
          10,
        ]);
        krakenRows.push([providerNowMs / 1_000, "100", "101", "99", "100", "100", "1000", 10]);
        return new Response(JSON.stringify({ error: [], result: { XXBTZUSD: krakenRows, last: String(providerNowMs / 1_000) } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.hostname === "api.exchange.coinbase.com") {
        if (providerMode === "partial") return new Response("upstream unavailable", { status: 503 });
        const multiplier = providerMode === "conflict" ? 1.1 : 1.001;
        const coinbaseRows = rows.map((row) => [
          row.timestamp / 1_000,
          row.low * multiplier,
          row.high * multiplier,
          row.open * multiplier,
          row.close * multiplier,
          row.volume,
        ]).reverse();
        return new Response(JSON.stringify(coinbaseRows), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`unexpected route test fetch: ${url.href}`);
    };

    const routeUrl = "http://localhost/api/market-integrity/klines?symbol=BTC&assetClass=crypto&marketId=bitcoin&quote=USD&range=15m";
    const routeDependencies = {
      resolveIdentity: async (requested: KlineAssetIdentity) => ({
        ok: true as const,
        identity: {
          ...requested,
          schemaVersion: "pass6-kline-asset-identity-v1" as const,
          exactMatch: true as const,
          resolver: "coingecko_coin_id_and_server_venue_registry" as const,
          providerObservedAt: new Date(Date.now() - 1_000).toISOString(),
          receivedAt: new Date().toISOString(),
          identityDigest: canonicalKlineIdentityDigest(requested),
        },
      }),
      fetchKlines: (identity: Parameters<typeof fetchVerifiedKlines>[0], range: Parameters<typeof fetchVerifiedKlines>[1]) =>
        fetchVerifiedKlines(identity, range, { fetchImpl: globalThis.fetch }),
    };
    const verifiedResponse = await handleKlineGet(new Request(routeUrl, { headers: { "user-agent": "pass6-route-state-test" } }), routeDependencies);
    const verifiedPayload = await verifiedResponse.json() as {
      mode?: string;
      candles?: unknown[];
      delivery?: { independentProviderCount?: number };
      sourceObservations?: unknown[];
      snapshotPersistence?: { stored?: boolean };
    };
    check(
      verifiedResponse.status === 200 && verifiedPayload.mode === "live_verified",
      `route emits live_verified only for complete exact quorum (${verifiedResponse.status}:${JSON.stringify(verifiedPayload)})`,
    );
    check(verifiedPayload.delivery?.independentProviderCount === 2 && verifiedPayload.sourceObservations?.length === 2, "route returns two independent source timestamps");
    check((verifiedPayload.candles?.length ?? 0) >= 220 && verifiedPayload.snapshotPersistence?.stored === true, "verified route may refresh signed LKG");

    providerMode = "partial";
    const partialResponse = await handleKlineGet(new Request(routeUrl, { headers: { "user-agent": "pass6-route-state-test" } }), routeDependencies);
    const partialPayload = await partialResponse.json() as { mode?: string; candles?: unknown[]; snapshotPersistence?: { stored?: boolean; reason?: string } };
    check(partialResponse.status === 200 && partialPayload.mode === "live_partial" && (partialPayload.candles?.length ?? 0) >= 220, "one exact provider is explicit partial, not LIVE");
    check(partialPayload.snapshotPersistence?.stored === false, "partial data cannot refresh LKG");

    providerMode = "conflict";
    const conflictResponse = await handleKlineGet(new Request(routeUrl, { headers: { "user-agent": "pass6-route-state-test" } }), routeDependencies);
    const conflictPayload = await conflictResponse.json() as { mode?: string; candles?: unknown[]; withheld?: boolean };
    check(conflictResponse.status === 409 && conflictPayload.mode === "conflict" && conflictPayload.withheld === true, "route withholds material provider conflict");
    check(conflictPayload.candles?.length === 0, "conflict response never leaks a selected candle series");
  } finally {
    globalThis.fetch = routeOriginalFetch;
    if (routeOriginalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = routeOriginalNodeEnv;
    if (routeOriginalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = routeOriginalUpstashUrl;
    if (routeOriginalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = routeOriginalUpstashToken;
    if (routeOriginalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = routeOriginalSupabaseUrl;
    if (routeOriginalPublicSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = routeOriginalPublicSupabaseUrl;
    if (routeOriginalSupabaseKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = routeOriginalSupabaseKey;
  }

  const oversized = await klineGet(new Request(`http://localhost/api/market-integrity/klines?${"x".repeat(1_100)}`));
  check(oversized.status === 414, "route rejects oversized URLs before provider work");
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await klineGet(new Request("http://localhost/api/market-integrity/klines?symbol=BTC", { headers: { "user-agent": "pass6-rate-limit-test" } }));
    check(response.status === 400, `bounded invalid request ${attempt + 1} is parsed without provider work`);
  }
  const limitedResponse = await klineGet(new Request("http://localhost/api/market-integrity/klines?symbol=BTC", { headers: { "user-agent": "pass6-rate-limit-test" } }));
  check(limitedResponse.status === 429, "thirteenth request is rate-limited");

  const component = await readFile("components/market-integrity/ShieldProCleanTerminalClient.tsx", "utf8");
  const providerSource = await readFile("lib/market-integrity/verified-kline-providers.ts", "utf8");
  const snapshotMigration = await readFile("db/market_integrity_kline_snapshots_pass6_hardening.sql", "utf8");
  check(
    component.includes("new URLSearchParams({") &&
    component.includes("symbol: row.symbol") &&
    component.includes('assetClass: "crypto"') &&
    component.includes("marketId: row.id") &&
    component.includes('quote: "USD"') &&
    component.includes("range: config.api") &&
    component.includes("klineParams.toString()"),
    "client sends canonical identity tuple through URLSearchParams",
  );
  check(
    !component.includes('partial: "LIVE · PARTIAL"') &&
    !component.includes('partial: "LIVE · CZĘŚCIOWE"') &&
    !component.includes('partial: "LIVE · TEILWEISE"') &&
    component.includes('partial: "PARTIAL · NOT LIVE"') &&
    component.includes('partial: "CZĘŚCIOWE · NIE LIVE"') &&
    component.includes('partial: "TEILWEISE · NICHT LIVE"'),
    "partial UI never says LIVE in any supported locale",
  );
  check(
    component.includes('mode === "error" ? t.unavailable : "SYNC"'),
    "loading and error terminal states never render LIVE",
  );
  check(
    component.includes('if ((payload.mode === "live" || payload.mode === "stale") && safeCandles.length)') &&
    component.includes('setChartMode("error")') &&
    component.includes('chartMode === "error" ? <p>{t.chartMissing}</p>'),
    "conflict and every non-live/non-stale payload are visibly withheld as unavailable",
  );
  check(providerSource.includes("brokeredEgressFetch") && providerSource.includes("maxRedirects: 0"), "provider requests use allowlisted no-redirect egress");
  check(
    snapshotMigration.includes("velmere_kline_snapshots_pass6_bundle_check") &&
    snapshotMigration.includes("velmere_kline_snapshots_source_observations_check") &&
    snapshotMigration.includes("revoke all on table public.velmere_kline_snapshots from anon, authenticated"),
    "durable snapshot migration enforces atomic PASS6 fields, source quorum and server-only access",
  );

  console.log(JSON.stringify({
    passId: PASS_ID,
    ok: true,
    assertions,
    liveCalls: 0,
    truthBoundary: "Code-only deterministic fixtures; no production or LIVE readiness claim.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
