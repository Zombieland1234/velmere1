import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildTerminalLaunchBridge } from "@/lib/market-integrity/terminal-launch-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "BTC";

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? (await analyzeDexScreenerToken(query));
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);

    return NextResponse.json({
      mode: "live",
      terminalLaunchBridge: buildTerminalLaunchBridge(result, {
        candlesCount: result.chart?.sevenDay?.length ?? 0,
        chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
        hasOrderBook: false,
        historyCount: history.length,
        activeCommand: searchParams.get("command") ?? "launch",
        sessionMode: "operator_session",
        terminalBootDeferred: true,
        modalChunkSplit: true,
        shieldMapDetached: true,
        tableWheelUnlocked: true,
        searchResolverGuarded: true,
        suggestionDismissOnOutsideClick: true,
        sourceHonestyVisible: true,
      }),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      {
        mode: "error",
        error: error instanceof Error ? error.message : "Launch bridge failed",
      },
      { status: 502 },
    );
  }
}
