import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { applyApiAbuseShield, abuseShieldResponseHeaders, abuseShieldResponseMeta } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RiskIndicatorResult = {
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: { name: string; value: number; weight: number; status: "green" | "yellow" | "red" }[];
  trend: { direction: "improving" | "stable" | "deteriorating"; change7d: number; change30d: number };
  alerts: { type: string; message: string; severity: "info" | "warning" | "critical" }[];
};

function deterministicStatus(value: number, thresholds: { high: number; mid: number }): "green" | "yellow" | "red" {
  if (value > thresholds.high) return "red";
  if (value > thresholds.mid) return "yellow";
  return "green";
}

function computeRiskIndicators(
  brain: Record<string, unknown>,
  history: Array<{ score?: number; timestamp?: string }>,
  fallbackMetrics?: { top10HolderPercent?: number; holderCount?: number; volume24h?: number; liquidityUsd?: number; priceChange24h?: number },
): RiskIndicatorResult {
  const riskScore = (brain as { brainScore?: number }).brainScore ?? 50;
  const confidence = (brain as { confidence?: number }).confidence ?? 50;

  const activeLayers = (brain as { activeLayers?: Array<{ id?: string; score?: number }> }).activeLayers ?? [];
  const layerMap = Object.fromEntries(activeLayers.map((l) => [l.id, l.score ?? 0]));

  const holderScore = layerMap["holders"] ?? (fallbackMetrics?.top10HolderPercent != null ? Math.min(100, fallbackMetrics.top10HolderPercent * 1.6) : 40);
  const contractScore = layerMap["contract"] ?? (fallbackMetrics?.holderCount != null ? (fallbackMetrics.holderCount > 10000 ? 25 : fallbackMetrics.holderCount > 1000 ? 45 : 65) : 40);
  const velocityScore = layerMap["velocity"] ?? (fallbackMetrics?.priceChange24h != null ? Math.min(100, Math.abs(fallbackMetrics.priceChange24h) * 3 + 15) : 35);

  const indicators = [
    { name: "Market Risk", value: Math.min(100, riskScore * 1.1), weight: 0.25, status: deterministicStatus(riskScore, { high: 70, mid: 40 }) },
    { name: "Liquidity Risk", value: Math.min(100, 100 - confidence), weight: 0.2, status: deterministicStatus(100 - confidence, { high: 70, mid: 40 }) },
    { name: "Concentration Risk", value: Math.min(100, holderScore), weight: 0.15, status: deterministicStatus(holderScore, { high: 70, mid: 40 }) },
    { name: "Contract Risk", value: Math.min(100, contractScore), weight: 0.15, status: deterministicStatus(contractScore, { high: 70, mid: 40 }) },
    { name: "Source Confidence", value: confidence, weight: 0.15, status: deterministicStatus(confidence, { high: 70, mid: 40 }) },
    { name: "Volatility Index", value: Math.min(100, velocityScore), weight: 0.1, status: deterministicStatus(velocityScore, { high: 70, mid: 40 }) },
  ];

  const overallScore = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0);
  const riskLevel = overallScore > 70 ? "critical" : overallScore > 50 ? "high" : overallScore > 30 ? "medium" : "low";

  const historyScores = history.filter((h): h is { score: number } => typeof h.score === "number");
  let slope = 0;
  if (historyScores.length >= 2) {
    slope = (historyScores.at(-1)!.score - historyScores[0].score) / historyScores.length;
  }
  const trend = {
    direction: (historyScores.length > 7 ? "stable" : slope > 2 ? "deteriorating" : slope < -2 ? "improving" : "stable") as "improving" | "stable" | "deteriorating",
    change7d: Math.round(slope * 7 * 100) / 100,
    change30d: Math.round(slope * 30 * 100) / 100,
  };

  const alerts = indicators
    .filter((ind) => ind.status === "red")
    .map((ind) => ({ type: ind.name, message: `${ind.name} is elevated at ${ind.value.toFixed(1)}`, severity: "warning" as const }));

  if (riskLevel === "critical") {
    alerts.push({ type: "overall", message: "Overall risk score is in critical zone", severity: "warning" as const });
  }

  return { overallScore, riskLevel, indicators, trend, alerts };
}

async function requireRiskIndicatorAccess(request: Request, query: string, locale: string) {
  const context = normalizePaidContext({ surface: "risk-indicator", locale: locale as "pl" | "en" | "de", assetId: query, symbol: query });
  const token = request.headers.get("x-velmere-paid-access");
  const verdict = await verifyVlmPaidAccessEntitlement({ token, productId: "risk_indicator_single", context });
  if (verdict.ok) return null;
  return securityJson({
    mode: "error",
    error: "payment_required",
    product: getVlmPaidProduct("risk_indicator_single", locale),
    context,
    reason: verdict.error,
    ledgerMode: verdict.ledgerMode,
  }, { status: 402, headers: { "x-velmere-paid-access-required": "risk_indicator_single" } });
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "risk-indicator", { keyPrefix: "risk-indicator", providerId: "risk-indicator", queryParam: "query" });
  if (!shield.ok) return shield.response;
  const query = shield.query ?? "";
  if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });

  const accessGate = await requireRiskIndicatorAccess(request, query, "en");
  if (accessGate) return accessGate;

  try {
    let brain: Record<string, unknown> = {};
    let symbol = query;
    let history: Array<{ score?: number; timestamp?: string }> = [];
    let fallbackMetrics: { top10HolderPercent?: number; holderCount?: number; volume24h?: number; liquidityUsd?: number; priceChange24h?: number } | undefined;

    const marketHit = await searchCoinGeckoMarket(query);
    if (marketHit) {
      symbol = marketHit.result.token.symbol ?? query;
      history = await getPersistentRiskHistory(marketHit.result.token.marketId ?? query);
      brain = buildRiskBrain(marketHit.result, history) as unknown as Record<string, unknown>;
      fallbackMetrics = {
        top10HolderPercent: marketHit.result.metrics.top10HolderPercent,
        holderCount: marketHit.result.metrics.holderCount,
        volume24h: marketHit.result.metrics.volume24h,
        liquidityUsd: marketHit.result.metrics.liquidityUsd,
        priceChange24h: marketHit.result.metrics.priceChange24h,
      };
    } else {
      const dexResult = await analyzeDexScreenerToken(query);
      symbol = dexResult.token.symbol ?? query;
      brain = dexResult as unknown as Record<string, unknown>;
      fallbackMetrics = {
        top10HolderPercent: dexResult.metrics.top10HolderPercent,
        holderCount: dexResult.metrics.holderCount,
        volume24h: dexResult.metrics.volume24h,
        liquidityUsd: dexResult.metrics.liquidityUsd,
      };
    }

    const riskIndicators = computeRiskIndicators(brain, history, fallbackMetrics);
    return securityJson({ mode: "live", query: symbol, riskIndicators, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  } catch {
    return securityJson({ mode: "degraded", error: "Risk indicator analysis unavailable" }, { status: 502 });
  }
}
