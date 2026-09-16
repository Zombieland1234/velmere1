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
      generatedAt,
      identityBinding,
      tierState: shieldMapTierState(),
      engine: {
        marketData: "withheld", riskEngine: "withheld", generativeNarrative: "withheld",
        webOsint: "not_connected", locale: args.locale,
      },
      guardrails: { remaining: args.rateLimit.remaining, resetAt: args.rateLimit.resetAt },
    }, { status: 424, headers: args.headers });
  }

  const id = args.result.token.marketId
    ?? args.result.token.tokenAddress
    ?? args.result.token.symbol;
  const history = await effects.getHistory(id, 144);
  const investigator = effects.buildInvestigator(args.result);
  const evidenceReport = effects.buildEvidenceReport(args.result, investigator);
  const sourceSnapshot = await effects.persistSnapshot(args.result, investigator, evidenceReport);

  return NextResponse.json({
    mode: publication.mode,
    publication,
    investigator,
    evidenceReport,
    sourceSnapshot,
    result: args.result,
    history,
    generatedAt,
    identityBinding,
    tierState: shieldMapTierState(),
    engine: {
      marketData: publication.evidenceState,
      riskEngine: "connected",
      generativeNarrative: process.env.VELMERE_ANGEL_PROVIDER ? "configured" : "not_configured",
      webOsint: "not_connected",
      locale: args.locale,
    },
    note: "This endpoint prepares the VLM Shield Investigator protocol and current market-data context. Full OSINT verdict still requires current web search against the provided queries.",
    guardrails: { remaining: args.rateLimit.remaining, resetAt: args.rateLimit.resetAt },
  }, { headers: args.headers });
}

export type ShieldMapRouteDependencies = {
  checkRequestRateLimit?: typeof checkRateLimit;
  resolveResult?: typeof resolveShieldMapResult;
  buildResponse?: typeof buildShieldMapIdentityBoundResponse;
};

export async function executeShieldMapGetRequest(
  request: Request,
  dependencies: ShieldMapRouteDependencies = {},
) {
  if (request.method !== "GET") {
    return NextResponse.json({ mode: "error", error: "method_not_allowed" }, {
      status: 405, headers: { allow: "GET", "cache-control": "no-store" },
    });
  }
  const checkRequestRateLimit = dependencies.checkRequestRateLimit ?? checkRateLimit;
  const resolveResult = dependencies.resolveResult ?? resolveShieldMapResult;
  const buildResponse = dependencies.buildResponse ?? buildShieldMapIdentityBoundResponse;
  const rateLimit = await checkRequestRateLimit(request, "investigator");
  const headers = guardrailHeaders(rateLimit);
  if (!rateLimit.ok) {
    return rateLimit.response ?? NextResponse.json({ mode: "error", error: "rate_limit_unavailable" }, {
      status: 503, headers,
    });
  }
  const parsedQuery = parseShieldMapQuery(new URL(request.url));
  if (!parsedQuery.ok) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: parsedQuery.code }, {
      status: parsedQuery.status, headers,
    });
  }
  const rightsPreflight = buildShieldBasicDeliveryPreflight("investigator");
  // Request headers, query parameters and NODE_ENV cannot grant data rights.
  if (!rightsPreflight.customerDeliveryAllowed || !rightsPreflight.providerNetworkAllowed) {
    const projected = projectShieldBasicCustomerDelivery({ decision: rightsPreflight, payload: null, status: 503 });
    return NextResponse.json(projected.payload, { status: projected.status, headers });
  }
  try {
    const resolved = await resolveResult({ query: parsedQuery.value });
    if (!resolved.ok) {
      return NextResponse.json<ErrorPayload>({ mode: "error", error: resolved.code }, {
        status: resolved.code === "shield_map_provider_unavailable" ? 503 : 409, headers,
      });
    }
    const response = await buildResponse({
      query: parsedQuery.value, locale: parsedQuery.value.locale,
      result: resolved.result, headers, rateLimit,
    });
    // Re-check the immutable rights authority at final customer egress.
    const projected = projectShieldBasicCustomerDelivery({
      decision: rightsPreflight, payload: await response.json(), status: response.status,
    });
    return NextResponse.json(projected.payload, { status: projected.status, headers });
  } catch {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "shield_map_provider_unavailable" }, {
      status: 503, headers,
    });
  }
}

export async function GET(request: Request) {
  return executeShieldMapGetRequest(request);
}
