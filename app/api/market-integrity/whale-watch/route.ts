import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { applyApiAbuseShield, abuseShieldResponseHeaders, abuseShieldResponseMeta } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";
import { fetchWhaleWatchData } from "@/lib/market-integrity/whale-watch-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireWhaleWatchAccess(request: Request, query: string, locale: string) {
  const context = normalizePaidContext({ surface: "whale-watch", locale: locale as "pl" | "en" | "de", assetId: query, symbol: query });
  const token = request.headers.get("x-velmere-paid-access");
  const verdict = await verifyVlmPaidAccessEntitlement({ token, productId: "whale_watch_single", context });
  if (verdict.ok) return null;
  return securityJson({
    mode: "error",
    error: "payment_required",
    product: getVlmPaidProduct("whale_watch_single", locale),
    context,
    reason: verdict.error,
    ledgerMode: verdict.ledgerMode,
  }, { status: 402, headers: { "x-velmere-paid-access-required": "whale_watch_single" } });
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "whale-watch", { keyPrefix: "whale-watch", providerId: "whale-watch", queryParam: "query" });
  if (!shield.ok) return shield.response;
  const query = shield.query ?? "";
  if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });

  const accessGate = await requireWhaleWatchAccess(request, query, "en");
  if (accessGate) return accessGate;

  try {
    let symbol = query;
    let tokenResult;
    const marketHit = await searchCoinGeckoMarket(query);
    if (marketHit) {
      symbol = marketHit.result.token.symbol ?? query;
      tokenResult = marketHit.result;
    } else {
      const dexResult = await analyzeDexScreenerToken(query);
      symbol = dexResult.token.symbol ?? query;
      tokenResult = dexResult;
    }
    const whaleData = await fetchWhaleWatchData({
      tokenRiskResult: tokenResult,
      symbol,
    });
    return securityJson({ mode: "live", query: symbol, whaleData, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  } catch (error) {
    return securityJson({ mode: "degraded", error: "Whale watch analysis unavailable" }, { status: 502 });
  }
}
