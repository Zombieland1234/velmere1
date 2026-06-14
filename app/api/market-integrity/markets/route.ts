import { NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/lib/market-integrity/coingecko";
import { buildSweepInsights, getMarketMemoryStatus, recordMarketRows } from "@/lib/market-integrity/market-memory";
import { persistMarketRows, getRiskLedgerStatus } from "@/lib/market-integrity/risk-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("perPage") ?? "100");

  try {
    const rows = await fetchCoinGeckoMarkets({
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 100,
      vsCurrency: "usd",
    });
    const rowsWithMemory = recordMarketRows(rows);
    const ledger = await persistMarketRows(rowsWithMemory);

    return NextResponse.json({
      mode: "live",
      source: "CoinGecko markets + Velmère in-memory risk ledger",
      rows: rowsWithMemory,
      memory: getMarketMemoryStatus(),
      ledger,
      ledgerStatus: await getRiskLedgerStatus(),
      insights: buildSweepInsights(rowsWithMemory),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Market sweep failed" },
      { status: 502 },
    );
  }
}
