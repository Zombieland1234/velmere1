import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildTerminalPerformanceGuard } from "@/lib/market-integrity/terminal-performance-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "BTC";

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? (await analyzeDexScreenerToken(query));
    return NextResponse.json({
      mode: "live",
      performanceGuard: buildTerminalPerformanceGuard(result, {
        terminalBootDeferred: true,
        modalChunkSplit: true,
        orderBookDeferred: true,
        historyDeferred: true,
        heavyPanelsDeferred: true,
        shieldMapDetached: true,
        tableWheelUnlocked: true,
      }),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      {
        mode: "error",
        error: error instanceof Error ? error.message : "Performance guard failed",
      },
      { status: 502 },
    );
  }
}
