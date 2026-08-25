import { NextResponse } from "next/server";
import { appendProviderEvidencePacket } from "./provider-evidence-packet-ledger";
import {
  parseKlineRequestContract,
  resolveKlineAssetIdentity,
  type KlineAssetIdentity,
} from "./kline-asset-identity";
import { fetchVerifiedKlines } from "./verified-kline-providers";
import { assessKlineSeriesQuality, klineRangeProfile } from "./verified-kline-quality";
import { reportApiError } from "@/lib/security/api-error-envelope";
import { applyApiRateLimit, rejectOversizedUrl } from "@/lib/security/api-guard";
import { buildLocalDevelopmentKlineReference } from "./local-development-market-reference";
import {
  getKlineSnapshotCacheStatus,
  persistKlineSnapshot,
  readKlineSnapshotWithDurable,
  type KlineSourceObservation,
} from "./kline-snapshot-cache";
import {
  buildShieldBasicDeliveryPreflight,
  projectShieldBasicCustomerDelivery,
  type ShieldBasicDeliveryPreflight,
} from "./shield-basic-delivery-policy";

const SNAPSHOT_STORAGE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_URL_LENGTH = 1_024;

function snapshotSourceMaxAgeMs(range: Parameters<typeof assessKlineSeriesQuality>[0]["range"]) {
  const profile = klineRangeProfile(range);
  return Math.max(
    SNAPSHOT_STORAGE_TTL_MS,
    (profile.maxStaleIntervals + 1) * profile.intervalMs + 5_000,
  );
}

type ErrorPayload = {
  mode: "error";
  availability: "UNAVAILABLE";
  error: string;
  candles: readonly [];
  riskScore: null;
  confidence: null;
  liveClaimed: false;
};

function errorPayload(error: string): ErrorPayload {
  return {
    mode: "error",
    availability: "UNAVAILABLE",
    error,
    candles: [],
    riskScore: null,
    confidence: null,
    liveClaimed: false,
  };
}

function customerKlineResponse(
  decision: ShieldBasicDeliveryPreflight,
  payload: unknown,
  init: ResponseInit = {},
) {
  const projected = projectShieldBasicCustomerDelivery({
    decision,
    payload,
    status: init.status ?? 200,
  });
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return NextResponse.json(projected.payload, { ...init, status: projected.status, headers });
}

function sourceObservations(receipts: Awaited<ReturnType<typeof fetchVerifiedKlines>>["providerReceipts"]): KlineSourceObservation[] {
  return receipts.flatMap((receipt) => (
    receipt.ok && receipt.identityMatched && receipt.sourceObservedAt
      ? [{ provider: receipt.provider, observedAt: receipt.sourceObservedAt, receivedAt: receipt.receivedAt }]
      : []
  ));
}

function oldestObservedAt(observations: KlineSourceObservation[], fallback: string) {
  const timestamps = observations.map((row) => Date.parse(row.observedAt)).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : fallback;
}

async function readLastKnownGood(
  identity: KlineAssetIdentity,
  range: Parameters<typeof assessKlineSeriesQuality>[0]["range"],
  providerErrors: string[],
  rightsPreflight: ShieldBasicDeliveryPreflight,
) {
  const snapshot = await readKlineSnapshotWithDurable({ assetIdentity: identity, range, maxAgeMs: snapshotSourceMaxAgeMs(range) });
  if (!snapshot?.candles.length) return null;
  const staleQuality = assessKlineSeriesQuality({ rawCandles: snapshot.candles, range });
  return customerKlineResponse(rightsPreflight, {
    mode: "last_known_good",
    freshness: "last_known_good",
    source: `${snapshot.source} · cached last-known-good`,
    identity: snapshot.assetIdentity,
    pair: snapshot.pair,
    range,
    candles: snapshot.candles,
    generatedAt: snapshot.generatedAt,
    receivedAt: snapshot.receivedAt,
    sourceObservations: snapshot.sourceObservations,
    staleAgeMs: snapshot.ageMs,
    freshnessAges: {
      storedAgeMs: snapshot.storedAgeMs,
      sourceAgeMs: snapshot.sourceAgeMs,
      candleAgeMs: snapshot.candleAgeMs,
      rule: "worst_of_stored_source_received_and_latest_closed_candle",
    },
    snapshotReadMode: snapshot.readMode,
    snapshotPayloadHash: snapshot.payloadHash,
    snapshotIntegrity: {
      mode: snapshot.integrityMode,
      keyId: snapshot.integrityKeyId,
      verified: true,
    },
    providerErrors,
    quality: staleQuality.quality,
    verification: {
      state: "last_known_good",
      successfulProviders: snapshot.sourceObservations.map((row) => row.provider),
      providerCount: snapshot.sourceObservations.length,
      selectedProvider: "snapshot",
      exactIdentity: true,
      liveClaimAllowed: false,
    },
    cache: getKlineSnapshotCacheStatus(),
  });
}

export type KlineRouteDependencies = {
  resolveIdentity?: typeof resolveKlineAssetIdentity;
  fetchKlines?: typeof fetchVerifiedKlines;
};

export async function handleKlineGet(request: Request, dependencies: KlineRouteDependencies = {}) {
  const resolveIdentity = dependencies.resolveIdentity ?? resolveKlineAssetIdentity;
  const fetchKlines = dependencies.fetchKlines ?? fetchVerifiedKlines;
  const oversized = rejectOversizedUrl(request, MAX_URL_LENGTH);
  if (oversized) return oversized;

  const url = new URL(request.url);
  const parsed = parseKlineRequestContract(url);
  if (!parsed.ok) {
    // Invalid requests remain bounded, but they use a separate abuse bucket so
    // malformed traffic cannot consume the provider-work quota of valid users.
    const invalidLimiter = await applyApiRateLimit(request, {
      keyPrefix: "market-integrity-klines-invalid",
      limit: 12,
      windowMs: 60_000,
    });
    if (!invalidLimiter.ok) return invalidLimiter.response;
    return NextResponse.json(errorPayload(parsed.error), {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }

  const limiter = await applyApiRateLimit(request, {
    keyPrefix: "market-integrity-klines",
    limit: 12,
    windowMs: 60_000,
  });
  if (!limiter.ok) return limiter.response;

  const rightsPreflight = buildShieldBasicDeliveryPreflight("klines");
  if (!rightsPreflight.customerDeliveryAllowed || !rightsPreflight.providerNetworkAllowed) {
    return customerKlineResponse(rightsPreflight, null, { status: 503 });
  }

  const { identity: requestedIdentity, range } = parsed.value;
  const providerErrors: string[] = [];
  const localReference = buildLocalDevelopmentKlineReference({ identity: requestedIdentity, range });
  if (localReference) {
    return customerKlineResponse(rightsPreflight, localReference, {
      headers: {
        "cache-control": "no-store",
        "x-velmere-market-reference": "local-development-not-live",
      },
    });
  }
  const resolution = await resolveIdentity(requestedIdentity);
  if (!resolution.ok) {
    if (resolution.code !== "identity_provider_unavailable") {
      return customerKlineResponse(rightsPreflight, errorPayload(resolution.error), {
        status: resolution.status,
        headers: { "cache-control": "no-store" },
      });
    }
    providerErrors.push(resolution.code);
    const cached = await readLastKnownGood(requestedIdentity, range, providerErrors, rightsPreflight);
    if (cached) return cached;
    return customerKlineResponse(rightsPreflight, errorPayload("Canonical identity could not be verified and no signed last-known-good snapshot is available"), {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const data = await fetchKlines(resolution.identity, range);
    const generatedAt = new Date().toISOString();
    const observations = sourceObservations(data.providerReceipts);
    const evidenceObservedAt = oldestObservedAt(observations, generatedAt);
    const evidenceLedger = await appendProviderEvidencePacket({
      domain: "kline_series",
      assetKey: resolution.identity.identityDigest,
      scope: range,
      packetId: `${resolution.identity.identityDigest}:${range}:${data.quality.seriesDigest}:${data.consensus.consensusDigest}`,
      payloadDigest: data.quality.seriesDigest,
      observedAt: evidenceObservedAt,
      metadata: {
        selectedProvider: data.consensus.selectedProvider,
        providerCount: data.consensus.providerCount,
        qualityScore: data.quality.qualityScore,
        qualityState: data.quality.state,
        barCount: data.candles.length,
        consensusDigest: data.consensus.consensusDigest,
        consensusState: data.consensus.state,
        deliveryState: data.delivery.state,
        receivedAt: data.receivedAt,
        identityDigest: resolution.identity.identityDigest,
      },
    });

    if (data.delivery.state === "conflict") {
      return customerKlineResponse(rightsPreflight, {
        mode: "conflict",
        freshness: "withheld",
        source: "Cross-provider OHLC conflict",
        identity: resolution.identity,
        pair: data.pair,
        range,
        candles: [],
        withheld: true,
        generatedAt,
        receivedAt: data.receivedAt,
        sourceObservations: observations,
        providerErrors: data.providerErrors,
        providerReceipts: data.providerReceipts,
        quality: data.quality,
        verification: data.consensus,
        delivery: data.delivery,
        evidenceLedger,
        cache: getKlineSnapshotCacheStatus(),
      }, { status: 409, headers: { "cache-control": "no-store" } });
    }

    if (data.delivery.state === "live_partial") {
      return customerKlineResponse(rightsPreflight, {
        mode: "live_partial",
        freshness: "partial_not_live",
        source: data.source,
        identity: resolution.identity,
        pair: data.pair,
        range,
        candles: data.candles,
        generatedAt,
        receivedAt: data.receivedAt,
        sourceObservations: observations,
        providerErrors: data.providerErrors,
        providerReceipts: data.providerReceipts,
        quality: data.quality,
        verification: data.consensus,
        delivery: data.delivery,
        evidenceLedger,
        snapshotPersistence: { stored: false, reason: "only_live_verified_can_refresh_last_known_good" },
        cache: getKlineSnapshotCacheStatus(),
      }, { headers: { "cache-control": "no-store" } });
    }

    const latestClosedAt = new Date(
      (data.quality.latestClosedTimestamp ?? 0) + data.quality.expectedIntervalMs,
    ).toISOString();
    const snapshotPersistence = await persistKlineSnapshot({
      assetIdentity: requestedIdentity,
      pair: data.pair,
      range,
      source: data.source,
      generatedAt,
      receivedAt: data.receivedAt,
      sourceObservations: observations,
      latestClosedAt,
      ttlMs: SNAPSHOT_STORAGE_TTL_MS,
      candles: data.candles,
    });
    return customerKlineResponse(rightsPreflight, {
      mode: "live_verified",
      freshness: "source_timestamped",
      source: data.source,
      identity: resolution.identity,
      pair: data.pair,
      range,
      candles: data.candles,
      generatedAt,
      receivedAt: data.receivedAt,
      sourceObservations: observations,
      providerErrors: data.providerErrors,
      providerReceipts: data.providerReceipts,
      quality: data.quality,
      verification: data.consensus,
      delivery: data.delivery,
      evidenceLedger,
      snapshotPersistence,
      cache: getKlineSnapshotCacheStatus(),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    reportApiError(error, {
      route: "/api/market-integrity/klines",
      code: "verified_kline_providers_failed",
      status: 502,
    });
    providerErrors.push("verified_kline_providers_failed");
  }

  const cached = await readLastKnownGood(requestedIdentity, range, providerErrors, rightsPreflight);
  if (cached) return cached;
  return customerKlineResponse(
    rightsPreflight,
    errorPayload("No exact-identity OHLC provider quorum or signed last-known-good snapshot is available"),
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}
