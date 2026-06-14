import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildTerminalControlPlane } from "@/lib/market-integrity/terminal-control-plane";

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
    const controlPlane = buildTerminalControlPlane(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? marketRow?.sparkline7d?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "risk-result sparkline" : marketRow?.sparkline7d?.length ? "market-row sparkline" : "metric fallback",
      hasOrderBook: false,
      chatEnabled: true,
      accessLayerVisible: true,
      activeCommand: searchParams.get("command") ?? "ops",
      sessionMode: "operator_session",
    });

    return NextResponse.json({
      mode: "live",
      query,
      token: result.token,
      controlPlane,
      legalNote: "PASS62 control plane is product/data/ops readiness only. Not financial advice. Algorithmic risk flag only. Not legal proof or an accusation.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Terminal control plane generation failed" },
      { status: 502 },
    );
  }
}
