import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { fetchBinanceOrderBook } from "@/lib/market-integrity/binance-orderbook";
import { buildLiquidityIntelligence } from "@/lib/market-integrity/liquidity-intelligence";

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
    let orderbook = null;
    try {
      orderbook = await fetchBinanceOrderBook(result.token.symbol);
    } catch {
      orderbook = null;
    }
    const liquidityIntelligence = buildLiquidityIntelligence(result, orderbook);

    return NextResponse.json({
      mode: orderbook ? "live" : "fallback",
      result,
      orderbook,
      liquidityIntelligence,
      legalNote: "Liquidity intelligence is an anomaly flag only. Thin depth is not proof of manipulation and not financial advice.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Liquidity intelligence generation failed" },
      { status: 502 },
    );
  }
}
