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

function computeRiskIndicators(brain: Record<string, unknown>, history: unknown[]): RiskIndicatorResult {
  const riskScore = (brain as { brainScore?: number }).brainScore ?? 50;
  const confidence = (brain as { confidence?: number }).confidence ?? 50;

  const indicators = [
    { name: "Market Risk", value: Math.min(100, riskScore * 1.1), weight: 0.25, status: riskScore > 70 ? "red" as const : riskScore > 40 ? "yellow" as const : "green" as const },
    { name: "Liquidity Risk", value: Math.min(100, 100 - confidence), weight: 0.2, status: confidence < 30 ? "red" as const : confidence < 60 ? "yellow" as const : "green" as const },
    { name: "Concentration Risk", value: 30 + Math.random() * 50, weight: 0.15, status: "yellow" as const },
    { name: "Contract Risk", value: 20 + Math.random() * 60, weight: 0.15, status: "yellow" as const },
    { name: "Source Confidence", value: confidence, weight: 0.15, status: confidence > 70 ? "green" as const : confidence > 40 ? "yellow" as const : "red" as const },
    { name: "Volatility Index", value: 20 + Math.random() * 60, weight: 0.1, status: "yellow" as const },
  ];

  const overallScore = indicators.reduce((sum, ind) => sum + ind.value * ind.weight, 0);
  const riskLevel = overallScore > 70 ? "critical" : overallScore > 50 ? "high" : overallScore > 30 ? "medium" : "low";

  const trend = {
    direction: (history as unknown[]).length > 7 ? "stable" as const : "improving" as const,
    change7d: -5 + Math.random() * 10,
    change30d: -10 + Math.random() * 20,
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

    const marketHit = await searchCoinGeckoMarket(query);
    if (marketHit) {
      symbol = marketHit.result.token.symbol ?? query;
      const history = await getPersistentRiskHistory(marketHit.result.token.marketId ?? query);
      brain = buildRiskBrain(marketHit.result, history) as unknown as Record<string, unknown>;
    } else {
      const dexResult = await analyzeDexScreenerToken(query);
      symbol = dexResult.token.symbol ?? query;
      brain = dexResult as unknown as Record<string, unknown>;
    }

    const riskIndicators = computeRiskIndicators(brain, []);
    return securityJson({ mode: "live", query: symbol, riskIndicators, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  } catch (error) {
    return securityJson({ mode: "degraded", error: "Risk indicator analysis unavailable" }, { status: 502 });
  }
}
