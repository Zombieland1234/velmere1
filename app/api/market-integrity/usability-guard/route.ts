import { NextResponse } from "next/server";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildTerminalUsabilityGuard } from "@/lib/market-integrity/terminal-usability-guard";

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
    const history = await getPersistentRiskHistory(id, 72);
    const guard = buildTerminalUsabilityGuard(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "usability",
      sessionMode: "operator_session",
      searchHasIconSubmit: true,
      searchHasEmptyPlaceholder: true,
      shieldMapDetached: true,
      modalErrorBoundary: true,
      sortToggleEnabled: true,
      mobileBottomSheet: true,
    });

    return NextResponse.json({
      mode: "live",
      guard,
      historyCount: history.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Usability guard failed" },
      { status: 502 },
    );
  }
}
