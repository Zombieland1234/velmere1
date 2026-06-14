import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildTerminalOperatorFocus } from "@/lib/market-integrity/terminal-operator-focus";

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
      terminalOperatorFocus: buildTerminalOperatorFocus(result, {
        candlesCount: result.chart?.sevenDay?.length ?? 0,
        chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
        hasOrderBook: false,
        historyCount: history.length,
        activeCommand: searchParams.get("command") ?? "review",
        terminalBootDeferred: true,
        modalChunkSplit: true,
        heavyPanelsDeferred: true,
        modalErrorBoundary: true,
        focusedPanelRouting: true,
        sourceCooldownActive: false,
        rateLimitMiddlewareReady: false,
        exportInfrastructureReady: false,
        persistentAuditLogReady: false,
        walletSessionReady: false,
      }),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      {
        mode: "error",
        error: error instanceof Error ? error.message : "Operator focus console failed",
      },
      { status: 502 },
    );
  }
}
