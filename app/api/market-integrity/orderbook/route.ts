import { NextResponse } from "next/server";
import { fetchBinanceOrderBook } from "@/lib/market-integrity/binance-orderbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim();
  if (!symbol) return NextResponse.json({ mode: "error", error: "Missing symbol" }, { status: 400 });
  try {
    const orderbook = await fetchBinanceOrderBook(symbol);
    return NextResponse.json({ mode: "live", orderbook, generatedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ mode: "error", error: error instanceof Error ? error.message : "Order book request failed" }, { status: 502 });
  }
}
