import { publicApiError } from "@/lib/security/api-error-envelope";
import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { checkRateLimit, guardrailHeaders } from "@/lib/market-integrity/api-guardrails";
import type { RateLimitResult } from "@/lib/market-integrity/api-guardrails";
import { buildEvidenceReportDraft } from "@/lib/market-integrity/evidence-report";
import { persistSourceSnapshot } from "@/lib/market-integrity/source-snapshot-ledger";
import { enforceLegacyRiskPublicationTruth } from "@/lib/market-integrity/legacy-route-publication-truth";
import { parseShieldMapQuery, shieldMapTierState, verifyShieldMapResolvedIdentity } from "@/lib/market-integrity/shield-map-query-boundary";
import type { ShieldMapQuery } from "@/lib/market-integrity/shield-map-query-boundary";
import type { TokenRiskResult } from "@/lib/market-integrity/risk-types";
import {
  buildShieldBasicDeliveryPreflight,
  projectShieldBasicCustomerDelivery,
} from "@/lib/market-integrity/shield-basic-delivery-policy";

type ErrorPayload = { mode: "error"; error: string };

export type ShieldMapIdentityBoundEffects = {
  enforcePublicationTruth: typeof enforceLegacyRiskPublicationTruth;
  getHistory: typeof getPersistentRiskHistory;
  buildInvestigator: typeof buildVlmShieldInvestigator;
  buildEvidenceReport: typeof buildEvidenceReportDraft;
  persistSnapshot: typeof persistSourceSnapshot;
};

export type ShieldMapResolutionProviders = {
  searchMarket: typeof searchCoinGeckoMarket;
  analyzeAddress: typeof analyzeDexScreenerToken;
};

const DEFAULT_IDENTITY_BOUND_EFFECTS: ShieldMapIdentityBoundEffects = {
  enforcePublicationTruth: enforceLegacyRiskPublicationTruth,
  getHistory: getPersistentRiskHistory,
  buildInvestigator: buildVlmShieldInvestigator,
  buildEvidenceReport: buildEvidenceReportDraft,
  persistSnapshot: persistSourceSnapshot,
};

const DEFAULT_RESOLUTION_PROVIDERS: ShieldMapResolutionProviders = {
  searchMarket: searchCoinGeckoMarket,
  analyzeAddress: analyzeDexScreenerToken,
};

export async function resolveShieldMapResult(args: {
  query: ShieldMapQuery;
  now?: Date | number | string;
  providers?: ShieldMapResolutionProviders;
}) {
  const providers = args.providers ?? DEFAULT_RESOLUTION_PROVIDERS;
  if (args.query.namespace === "address") {
    try {
      return { ok: true as const, result: await providers.analyzeAddress(args.query.query) };
    } catch {
      return { ok: false as const, code: "shield_map_provider_unavailable" };
    }
  }
  let marketRow: { result: TokenRiskResult } | null;
  try {
    marketRow = await providers.searchMarket(args.query.query);
  } catch {
    return { ok: false as const, code: "shield_map_provider_unavailable" };
  }
  if (!marketRow) {
    return { ok: false as const, code: "shield_map_identity_missing" };
  }
  const identityBinding = verifyShieldMapResolvedIdentity(
    args.query,
    marketRow.result,
    { now: args.now },
  );
  return identityBinding.ok
    ? { ok: true as const, result: marketRow.result }
    : { ok: false as const, code: identityBinding.code };
}

export async function buildShieldMapIdentityBoundResponse(args: {
  query: ShieldMapQuery;
  locale: ShieldMapQuery["locale"];
  result: TokenRiskResult;
  headers: HeadersInit;
  rateLimit: Pick<RateLimitResult, "remaining" | "resetAt">;
  now?: Date | number | string;
  effects?: ShieldMapIdentityBoundEffects;
}) {
  const identityBinding = verifyShieldMapResolvedIdentity(
    args.query,
    args.result,
    { now: args.now },
  );
  if (!identityBinding.ok) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: identityBinding.code },
      { status: 409, headers: args.headers },
    );
  }

  const effects = args.effects ?? DEFAULT_IDENTITY_BOUND_EFFECTS;
  const generatedAt = new Date(
    args.now instanceof Date
      ? args.now.getTime()
      : typeof args.now === "number"
        ? args.now
        : typeof args.now === "string"
          ? Date.parse(args.now)
          : Date.now(),
  ).toISOString();
  const publication = effects.enforcePublicationTruth(args.result, generatedAt);
  if (
    publication.mode !== "live"
    || publication.evidenceState !== "verified"
    || publication.scorePublished !== true
  ) {
    return NextResponse.json({
      mode: "withheld" as const,
      error: "shield_map_publication_withheld",
      publication,
    }, { status: 409, headers: args.headers });
  }

  const history = effects.getHistory(args.result.marketId);
  const investigator = effects.buildInvestigator({
    assetId: args.result.marketId,
    symbol: args.result.symbol,
    name: args.result.name,
    result: args.result,
    history,
    locale: args.locale,
  });
  const evidenceReport = effects.buildEvidenceReport({
    assetId: args.result.marketId,
    symbol: args.result.symbol,
    name: args.result.name,
    result: args.result,
    history,
    locale: args.locale,
  });
  const snapshot = effects.persistSnapshot({
    kind: "shield-map",
    assetId: args.result.marketId,
    generatedAt,
    payload: {
      investigator,
      evidenceReport,
      publication,
    },
  });
  const preflight = buildShieldBasicDeliveryPreflight({
    result: args.result,
    publication,
    snapshot,
    generatedAt,
  });
  const customerDelivery = projectShieldBasicCustomerDelivery({
    result: args.result,
    publication,
    snapshot,
    preflight,
    generatedAt,
  });

  return NextResponse.json({
    mode: "live" as const,
    query: args.query,
    tier: shieldMapTierState("basic"),
    result: args.result,
    investigator,
    evidenceReport,
    publication,
    snapshot,
    customerDelivery,
    rateLimit: {
      remaining: args.rateLimit.remaining,
      resetAt: args.rateLimit.resetAt,
    },
  }, {
    status: 200,
    headers: args.headers,
  });
}

export async function handleMarketIntegrityShieldMapAction(request: Request) {
  const headers = guardrailHeaders();
  const rateLimit = await checkRateLimit(request, "market_integrity_shield_map");
  if (!rateLimit.allowed) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: "rate_limited" },
      { status: 429, headers },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: "invalid_json" },
      { status: 400, headers },
    );
  }

  const parsed = parseShieldMapQuery(payload);
  if (!parsed.ok) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: parsed.code },
      { status: 400, headers },
    );
  }

  const resolved = await resolveShieldMapResult({ query: parsed.query });
  if (!resolved.ok) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: resolved.code },
      { status: resolved.code === "shield_map_provider_unavailable" ? 503 : 404, headers },
    );
  }

  return buildShieldMapIdentityBoundResponse({
    query: parsed.query,
    locale: parsed.query.locale,
    result: resolved.result,
    headers,
    rateLimit,
  });
}
