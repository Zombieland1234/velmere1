import { NextResponse } from "next/server";
import { fetchCoinGeckoMarketChart, type MarketChartRange } from "@/lib/market-integrity/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ranges = new Set(["1m", "15m", "1h", "4h", "1d", "7d"]);

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const rangeParam = searchParams.get("range")?.trim() ?? "7d";
  const range = (ranges.has(rangeParam) ? rangeParam : "7d") as MarketChartRange;

  if (!id) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing coin id" }, { status: 400 });
  }

  try {
    const points = await fetchCoinGeckoMarketChart(id, range);
    return NextResponse.json({ mode: "live", source: "CoinGecko market_chart", id, range, points, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Chart request failed" },
      { status: 502 },
    );
  }
}
