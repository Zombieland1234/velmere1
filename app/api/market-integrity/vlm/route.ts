import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import {
  generateVlmBrainAnalysis,
  type VlmDepth,
  type VlmLocale,
  type VlmSurface,
} from "@/lib/ai/vlm-brain";
import { inspectVlmText } from "@/lib/ai/vlm-security";
import { recordVlmSecurityInspection } from "@/lib/ai/vlm-security-events";
import { getVlmPaidProduct, normalizePaidContext, type VlmPaidAccessContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";
import {
  applySoftRateLimit,
  assertSameOriginRequest,
  rejectLargeContentLength,
  rejectOversizedUrl,
  securityJson,
} from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function locale(value: unknown): VlmLocale {
  return value === "en" || value === "de" ? value : "pl";
}
function depth(value: unknown): VlmDepth {
  return value === "basic" || value === "pro" ? value : "advanced";
}
function surface(value: unknown): VlmSurface {
  return value === "real_markets" || value === "shield_map" || value === "lens" || value === "angel"
    ? value
    : "shield";
}

function paidSurface(value: VlmSurface): VlmPaidAccessContext["surface"] {
  if (value === "real_markets") return "real-markets";
  if (value === "lens") return "browser";
  return "shield";
}

function advancedAccessContext(args: { query: string; locale: VlmLocale; surface: VlmSurface; depth: VlmDepth }): VlmPaidAccessContext {
  return normalizePaidContext({
    surface: paidSurface(args.surface),
    locale: args.locale,
    assetId: args.query,
    symbol: args.query,
    depth: args.depth,
  }, args.locale);
}

async function requireAdvancedAnalysisAccess(request: Request, args: { query: string; locale: VlmLocale; surface: VlmSurface; depth: VlmDepth }) {
  if (args.depth !== "advanced") return null;
  const context = advancedAccessContext(args);
  const token = request.headers.get("x-velmere-paid-access");
  const verdict = await verifyVlmPaidAccessEntitlement({
    token,
    productId: "vlm_advanced_analysis_single",
    context,
  });
  if (verdict.ok) return null;
  return securityJson({
    mode: "error",
    error: "payment_required",
    product: getVlmPaidProduct("vlm_advanced_analysis_single", args.locale),
    context,
    reason: verdict.error,
    ledgerMode: verdict.ledgerMode,
  }, { status: 402, headers: { "x-velmere-paid-access-required": "vlm_advanced_analysis_single" } });
}

async function resolveAnalysis(query: string, options: { locale: VlmLocale; depth: VlmDepth; surface: VlmSurface; prompt?: string }) {
  const marketRow = await searchCoinGeckoMarket(query);
  const result = marketRow?.result ?? (await analyzeDexScreenerToken(query));
  const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
  const history = await getPersistentRiskHistory(id, 144);
  const brain = buildRiskBrain(result, history);
  const ai = await generateVlmBrainAnalysis({ result, brain, ...options });
  return { mode: "live" as const, result, marketRow, history, brain, ai };
}

export async function GET(request: Request) {
  const urlGuard = rejectOversizedUrl(request, 2_048);
  if (urlGuard) return urlGuard;
  const rateLimit = applySoftRateLimit(request, { keyPrefix: "vlm-brain-get", limit: 36, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim();
  if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });
  const queryInspection = inspectVlmText(query, 180);
  const promptInspection = inspectVlmText(url.searchParams.get("prompt"), 800);
  recordVlmSecurityInspection({ inspection: queryInspection, vector: "input", route: "/api/market-integrity/vlm", request });
  recordVlmSecurityInspection({ inspection: promptInspection, vector: "input", route: "/api/market-integrity/vlm", request });
  if (!queryInspection.safe || !promptInspection.safe) {
    return securityJson({ mode: "error", error: "security_policy" }, { status: 400 });
  }
  try {
    const resolvedLocale = locale(url.searchParams.get("locale"));
    const resolvedDepth = depth(url.searchParams.get("depth"));
    const resolvedSurface = surface(url.searchParams.get("surface"));
    const paidGate = await requireAdvancedAnalysisAccess(request, {
      query,
      locale: resolvedLocale,
      depth: resolvedDepth,
      surface: resolvedSurface,
    });
    if (paidGate) return paidGate;
    const payload = await resolveAnalysis(query, {
      locale: resolvedLocale,
      depth: resolvedDepth,
      surface: resolvedSurface,
      prompt: url.searchParams.get("prompt")?.trim() || undefined,
    });
    return securityJson(payload);
  } catch (error) {
    console.error("[VLM API] GET analysis failed", error);
    return securityJson({ mode: "error", error: "analysis_unavailable" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const sizeGuard = rejectLargeContentLength(request, 32 * 1024);
  if (sizeGuard) return sizeGuard;
  const originGuard = assertSameOriginRequest(request, { allowMissingOrigin: true });
  if (originGuard) return originGuard;
  const rateLimit = applySoftRateLimit(request, { keyPrefix: "vlm-brain-post", limit: 24, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;
  try {
    const body = (await request.json()) as {
      query?: string;
      locale?: VlmLocale;
      depth?: VlmDepth;
      surface?: VlmSurface;
      prompt?: string;
    };
    const query = body.query?.trim();
    if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });
    const queryInspection = inspectVlmText(query, 180);
    const promptInspection = inspectVlmText(body.prompt, 800);
    recordVlmSecurityInspection({ inspection: queryInspection, vector: "input", route: "/api/market-integrity/vlm", request });
    recordVlmSecurityInspection({ inspection: promptInspection, vector: "input", route: "/api/market-integrity/vlm", request });
    if (!queryInspection.safe || !promptInspection.safe) {
      return securityJson({ mode: "error", error: "security_policy" }, { status: 400 });
    }
    const resolvedLocale = locale(body.locale);
    const resolvedDepth = depth(body.depth);
    const resolvedSurface = surface(body.surface);
    const paidGate = await requireAdvancedAnalysisAccess(request, {
      query,
      locale: resolvedLocale,
      depth: resolvedDepth,
      surface: resolvedSurface,
    });
    if (paidGate) return paidGate;
    return securityJson(
      await resolveAnalysis(query, {
        locale: resolvedLocale,
        depth: resolvedDepth,
        surface: resolvedSurface,
        prompt: body.prompt?.trim() || undefined,
      }),
    );
  } catch (error) {
    console.error("[VLM API] POST analysis failed", error);
    return securityJson({ mode: "error", error: "analysis_unavailable" }, { status: 502 });
  }
}
