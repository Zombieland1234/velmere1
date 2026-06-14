import { NextResponse } from "next/server";
import { fetchBinanceKlines, type BinanceKlineInterval } from "@/lib/market-integrity/binance-klines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ranges = new Set(["1m", "15m", "1h", "4h", "1d", "7d"]);

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim();
  const rangeParam = searchParams.get("range")?.trim() ?? "7d";
  const range = (ranges.has(rangeParam) ? rangeParam : "7d") as BinanceKlineInterval;

  if (!symbol) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing symbol" }, { status: 400 });
  }

  try {
    const data = await fetchBinanceKlines(symbol, range);
    return NextResponse.json({
      mode: "live",
      source: data.source,
      pair: data.pair,
      range,
      candles: data.candles,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Kline request failed" },
      { status: 502 },
    );
  }
}
