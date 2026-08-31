import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import {
  generateVlmBrainAnalysis,
  type VlmDepth,
  type VlmLocale,
  type VlmSurface,
} from "@/lib/ai/vlm-brain";
import { inspectVlmText } from "@/lib/ai/vlm-security";
import { recordVlmSecurityInspection } from "@/lib/ai/vlm-security-events";
import { applyApiAbuseShield, abuseShieldResponseHeaders, abuseShieldResponseMeta } from "@/lib/security/api-abuse-shield";
import { securityJson, applySoftRateLimit, rejectLargeContentLength } from "@/lib/security/api-guard";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHIELD_PRO_PRODUCT_MAP: Record<VlmDepth, "shield_pro_basic_single" | "shield_pro_pro_single" | "shield_pro_advanced_single"> = {
  basic: "shield_pro_basic_single",
  pro: "shield_pro_pro_single",
  advanced: "shield_pro_advanced_single",
};

function depth(value: unknown): VlmDepth {
  return value === "basic" || value === "pro" ? value : "advanced";
}

function locale(value: unknown): VlmLocale {
  return value === "en" || value === "de" ? value : "pl";
}

async function requireShieldProAccess(request: Request, args: { query: string; locale: VlmLocale; depth: VlmDepth }) {
  const productId = SHIELD_PRO_PRODUCT_MAP[args.depth];
  const context = normalizePaidContext({ surface: "shield-pro", locale: args.locale, assetId: args.query, symbol: args.query, depth: args.depth });
  const token = request.headers.get("x-velmere-paid-access");
  const verdict = await verifyVlmPaidAccessEntitlement({ token, productId, context });
  if (verdict.ok) return null;
  return securityJson({
    mode: "error",
    error: "payment_required",
    product: getVlmPaidProduct(productId, args.locale),
    context,
    reason: verdict.error,
    ledgerMode: verdict.ledgerMode,
  }, { status: 402, headers: { "x-velmere-paid-access-required": productId } });
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "shield-pro", { keyPrefix: "shield-pro", providerId: "shield-pro", queryParam: "query" });
  if (!shield.ok) return shield.response;
  const url = new URL(request.url);
  const query = shield.query ?? url.searchParams.get("query")?.trim();
  if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });

  const queryInspection = inspectVlmText(query, 180);
  recordVlmSecurityInspection({ inspection: queryInspection, vector: "input", route: "/api/market-integrity/shield-pro", request });
  if (!queryInspection.safe) return securityJson({ mode: "error", error: "security_policy" }, { status: 400 });

  const resolvedLocale = locale(url.searchParams.get("locale"));
  const resolvedDepth = depth(url.searchParams.get("depth"));

  const accessGate = await requireShieldProAccess(request, { query, locale: resolvedLocale, depth: resolvedDepth });
  if (accessGate) return accessGate;

  try {
    const marketHit = await searchCoinGeckoMarket(query);
    let result, history, brain, ai;

    if (marketHit) {
      result = marketHit.result;
      const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
      history = await getPersistentRiskHistory(id, 144);
      brain = buildRiskBrain(result, history);
      ai = await generateVlmBrainAnalysis({ result, brain, locale: resolvedLocale, depth: resolvedDepth, surface: "shield" as VlmSurface });
    } else {
      result = await analyzeDexScreenerToken(query);
      const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
      history = await getPersistentRiskHistory(id, 144);
      brain = buildRiskBrain(result, history);
      ai = await generateVlmBrainAnalysis({ result, brain, locale: resolvedLocale, depth: resolvedDepth, surface: "shield" as VlmSurface });
    }

    return securityJson({
      mode: "live",
      product: "shield-pro",
      depth: resolvedDepth,
      result,
      history,
      brain,
      ai,
      ...abuseShieldResponseMeta(shield),
    }, { headers: abuseShieldResponseHeaders(shield) });
  } catch (error) {
    return securityJson({ mode: "degraded", error: "Shield Pro analysis unavailable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const sizeGuard = rejectLargeContentLength(request, 32 * 1024);
  if (sizeGuard) return sizeGuard;
  const rateLimit = applySoftRateLimit(request, { keyPrefix: "shield-pro-post", limit: 24, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;
  try {
    const body = (await request.json()) as { query?: string; locale?: string; depth?: string };
    const query = body.query?.trim();
    if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });

    const queryInspection = inspectVlmText(query, 180);
    recordVlmSecurityInspection({ inspection: queryInspection, vector: "input", route: "/api/market-integrity/shield-pro", request });
    if (!queryInspection.safe) return securityJson({ mode: "error", error: "security_policy" }, { status: 400 });

    const resolvedLocale = locale(body.locale);
    const resolvedDepth = depth(body.depth);

    const accessGate = await requireShieldProAccess(request, { query, locale: resolvedLocale, depth: resolvedDepth });
    if (accessGate) return accessGate;

    const marketHit = await searchCoinGeckoMarket(query);
    let result, history, brain, ai;

    if (marketHit) {
      result = marketHit.result;
      const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
      history = await getPersistentRiskHistory(id, 144);
      brain = buildRiskBrain(result, history);
      ai = await generateVlmBrainAnalysis({ result, brain, locale: resolvedLocale, depth: resolvedDepth, surface: "shield" as VlmSurface });
    } else {
      result = await analyzeDexScreenerToken(query);
      const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
      history = await getPersistentRiskHistory(id, 144);
      brain = buildRiskBrain(result, history);
      ai = await generateVlmBrainAnalysis({ result, brain, locale: resolvedLocale, depth: resolvedDepth, surface: "shield" as VlmSurface });
    }

    return securityJson({ mode: "live", product: "shield-pro", depth: resolvedDepth, result, history, brain, ai });
  } catch (error) {
    return securityJson({ mode: "degraded", error: "Shield Pro analysis unavailable" }, { status: 502 });
  }
}
