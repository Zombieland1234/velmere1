import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildProductionHardening } from "@/lib/market-integrity/production-hardening";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const productionHardening = buildProductionHardening(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? marketRow?.sparkline7d?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "risk-result sparkline" : marketRow?.sparkline7d?.length ? "market-row sparkline" : "metric fallback",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "production",
      sessionMode: searchParams.get("session") === "member" ? "member_session" : "operator_session",
      chatEnabled: true,
      accessLayerVisible: true,
    });

    return NextResponse.json({
      mode: "live",
      query,
      token: result.token,
      productionHardening,
      legalNote: "PASS64 production hardening is release-readiness triage only. Not financial advice. Algorithmic risk flag only. Not legal proof or an accusation.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Production hardening generation failed" },
      { status: 502 },
    );
  }
}
