import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { fetchBinanceOrderBook, type OrderBookDepthResult } from "@/lib/market-integrity/binance-orderbook";
import { applyApiAbuseShield, abuseShieldResponseHeaders, abuseShieldResponseMeta } from "@/lib/security/api-abuse-shield";
import { securityJson } from "@/lib/security/api-guard";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketImpactResult = {
  token: { symbol: string; name: string; marketId?: string; tokenAddress?: string };
  level: string;
  liquidityDepth?: number;
  slippageEstimate?: number;
  stressTest?: { scenario: string; impact: number; slippageEstimate: number }[];
  orderbookImbalance?: number;
  largeOrderImpact?: { size: number; estimatedSlippage: number; marketImpactBps: number }[];
  orderbook?: {
    source: string;
    bestBid?: number;
    bestAsk?: number;
    spreadPercent?: number;
    bidDepthUsd: number;
    askDepthUsd: number;
    bidAskImbalancePercent: number;
    simulatedSellSlippage10k?: number;
    simulatedBuySlippage10k?: number;
    riskPoints: number;
    signals: Array<{ id: string; label: string; points: number }>;
  };
};

function simulateImpactFromOrderBook(
  orderBook: OrderBookDepthResult,
  mid: number,
): Pick<MarketImpactResult, "largeOrderImpact" | "stressTest" | "liquidityDepth" | "orderbookImbalance" | "slippageEstimate"> {
  const totalDepth = orderBook.bidDepthUsd + orderBook.askDepthUsd;
  const orderSizes = [1000, 5000, 10000, 50000, 100000];

  const largeOrderImpact = orderSizes.map((size) => {
    const fractionOfBook = totalDepth > 0 ? size / totalDepth : 1;
    const baseSlippage = fractionOfBook * 100;
    const imbalanceFactor = 1 + Math.abs(orderBook.bidAskImbalancePercent) / 100;
    const estimatedSlippage = Math.min(baseSlippage * imbalanceFactor, 50);
    return {
      size,
      estimatedSlippage: Math.round(estimatedSlippage * 100) / 100,
      marketImpactBps: Math.round(estimatedSlippage * 100),
    };
  });

  const imbalanceRatio = orderBook.bidAskImbalancePercent / 100;
  const stressTest = [
    { scenario: "Flash crash (-30%)", impact: -30 + imbalanceRatio * 10, slippageEstimate: Math.min(30 + Math.abs(orderBook.simulatedSellSlippage10k ?? 0) * 3, 50) },
    { scenario: "Whale dump (-15%)", impact: -15 + imbalanceRatio * 5, slippageEstimate: Math.min(15 + Math.abs(orderBook.simulatedSellSlippage10k ?? 0) * 2, 40) },
    { scenario: "Pump (+50%)", impact: 50 - imbalanceRatio * 8, slippageEstimate: Math.min(50 * (totalDepth < 500_000 ? 1.5 : 1), 60) },
    { scenario: "Low liquidity stress", impact: -20 * (1 + imbalanceRatio), slippageEstimate: Math.min(20 + (totalDepth < 250_000 ? 15 : 0), 45) },
  ].sort((a, b) => b.slippageEstimate - a.slippageEstimate);

  return {
    liquidityDepth: totalDepth,
    orderbookImbalance: orderBook.bidAskImbalancePercent / 100,
    slippageEstimate: orderBook.simulatedSellSlippage10k,
    largeOrderImpact,
    stressTest,
  };
}

async function requireMarketImpactAccess(request: Request, query: string, locale: string) {
  const context = normalizePaidContext({ surface: "market-impact", locale: locale as "pl" | "en" | "de", assetId: query, symbol: query });
  const token = request.headers.get("x-velmere-paid-access");
  const verdict = await verifyVlmPaidAccessEntitlement({ token, productId: "market_impact_single", context });
  if (verdict.ok) return null;
  return securityJson({
    mode: "error",
    error: "payment_required",
    product: getVlmPaidProduct("market_impact_single", locale),
    context,
    reason: verdict.error,
    ledgerMode: verdict.ledgerMode,
  }, { status: 402, headers: { "x-velmere-paid-access-required": "market_impact_single" } });
}

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "market-impact", { keyPrefix: "market-impact", providerId: "market-impact", queryParam: "query" });
  if (!shield.ok) return shield.response;
  const query = shield.query ?? "";
  if (!query) return securityJson({ mode: "error", error: "missing_query" }, { status: 400 });

  const accessGate = await requireMarketImpactAccess(request, query, "en");
  if (accessGate) return accessGate;

  try {
    const marketHit = await searchCoinGeckoMarket(query);
    let result: MarketImpactResult;
    let orderBook: OrderBookDepthResult | null = null;

    const symbol = marketHit?.result.token.symbol ?? query;

    try {
      orderBook = await fetchBinanceOrderBook(symbol);
    } catch {
      orderBook = null;
    }

    if (marketHit) {
      const brain = buildRiskBrain(marketHit.result, []);
      const mid = orderBook?.bestBid && orderBook?.bestAsk ? (orderBook.bestBid + orderBook.bestAsk) / 2 : marketHit.result.metrics.currentPrice ?? 0;
      const impact = orderBook ? simulateImpactFromOrderBook(orderBook, mid) : {
        liquidityDepth: marketHit.result.metrics.liquidityUsd ?? 0,
        orderbookImbalance: 0,
        slippageEstimate: undefined,
        largeOrderImpact: [],
        stressTest: [],
      };
      result = {
        ...marketHit.result,
        ...impact,
        orderbook: orderBook ? {
          source: orderBook.source,
          bestBid: orderBook.bestBid,
          bestAsk: orderBook.bestAsk,
          spreadPercent: orderBook.spreadPercent,
          bidDepthUsd: orderBook.bidDepthUsd,
          askDepthUsd: orderBook.askDepthUsd,
          bidAskImbalancePercent: orderBook.bidAskImbalancePercent,
          simulatedSellSlippage10k: orderBook.simulatedSellSlippage10k,
          simulatedBuySlippage10k: orderBook.simulatedBuySlippage10k,
          riskPoints: orderBook.riskPoints,
          signals: orderBook.signals,
        } : undefined,
      };
      return securityJson({ mode: orderBook ? "live" : "degraded", result, brain, impactAnalysis: true, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
    }
    const dexResult = await analyzeDexScreenerToken(query);
    const mid = orderBook?.bestBid && orderBook?.bestAsk ? (orderBook.bestBid + orderBook.bestAsk) / 2 : 0;
    const impact = orderBook ? simulateImpactFromOrderBook(orderBook, mid) : {
      liquidityDepth: 0,
      orderbookImbalance: 0,
      slippageEstimate: undefined,
      largeOrderImpact: [],
      stressTest: [],
    };
    result = {
      ...dexResult,
      ...impact,
      orderbook: orderBook ? {
        source: orderBook.source,
        bestBid: orderBook.bestBid,
        bestAsk: orderBook.bestAsk,
        spreadPercent: orderBook.spreadPercent,
        bidDepthUsd: orderBook.bidDepthUsd,
        askDepthUsd: orderBook.askDepthUsd,
        bidAskImbalancePercent: orderBook.bidAskImbalancePercent,
        simulatedSellSlippage10k: orderBook.simulatedSellSlippage10k,
        simulatedBuySlippage10k: orderBook.simulatedBuySlippage10k,
        riskPoints: orderBook.riskPoints,
        signals: orderBook.signals,
      } : undefined,
    };
    return securityJson({ mode: orderBook ? "live" : "degraded", result, impactAnalysis: true, ...abuseShieldResponseMeta(shield) }, { headers: abuseShieldResponseHeaders(shield) });
  } catch (error) {
    return securityJson({ mode: "degraded", error: "Market impact analysis unavailable" }, { status: 502 });
  }
}
