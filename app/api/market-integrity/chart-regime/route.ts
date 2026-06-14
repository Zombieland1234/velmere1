import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { fetchBinanceKlines } from "@/lib/market-integrity/binance-klines";
import { buildChartRegime } from "@/lib/market-integrity/chart-regime";
import type { MarketChartRange } from "@/lib/market-integrity/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };
const supportedRanges = new Set(["1m", "15m", "1h", "4h", "1d", "7d"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const rangeParam = searchParams.get("range") ?? "1h";
  const range = (supportedRanges.has(rangeParam) ? rangeParam : "1h") as MarketChartRange;
  if (!query) return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    let bars = result.chart?.sevenDay?.length ?? 0;
    let rangePercent = Math.max(Math.abs(result.metrics.priceChange24h ?? 0), Math.abs(result.metrics.priceChange7d ?? 0) / 2);
    let source = "market metrics";
    try {
      const klines = await fetchBinanceKlines(result.token.symbol, range);
      bars = klines.candles.length;
      source = klines.source;
      const first = klines.candles[0]?.open;
      const last = klines.candles.at(-1)?.close;
      if (first && last) rangePercent = ((last - first) / first) * 100;
    } catch {
      source = result.chart?.sevenDay?.length ? "result.chart.sevenDay fallback" : "market metrics fallback";
    }
    const chartRegime = buildChartRegime(result, { bars, rangePercent: Math.abs(rangePercent), source });
    return NextResponse.json({ mode: "live", range, result, chartRegime, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Chart regime failed" },
      { status: 502 },
    );
  }
}
