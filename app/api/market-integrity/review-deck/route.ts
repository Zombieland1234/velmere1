import { NextResponse } from "next/server";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildTerminalReviewDeck } from "@/lib/market-integrity/terminal-review-deck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });
  }

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 72);
    const terminalReviewDeck = buildTerminalReviewDeck(result, {
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      historyCount: history.length,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      hasOrderBook: false,
      activeCommand: searchParams.get("command") ?? "deck",
      terminalBootDeferred: true,
      modalChunkSplit: true,
      heavyPanelsDeferred: true,
      sourceCooldownActive: false,
      searchLocalFirst: true,
      suggestionDismissOnOutsideClick: true,
      tableWheelUnlocked: true,
      shieldMapDetached: true,
      focusedPanelRouting: true,
      rateLimitMiddlewareReady: false,
      exportInfrastructureReady: false,
      persistentAuditLogReady: false,
      walletSessionReady: false,
    });

    return NextResponse.json({ mode: "live", terminalReviewDeck, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Review deck failed" },
      { status: 502 },
    );
  }
}
