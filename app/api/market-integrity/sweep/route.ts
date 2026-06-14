import { NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/lib/market-integrity/coingecko";
import {
  buildSweepInsights,
  getMarketMemoryStatus,
  recordMarketRows,
} from "@/lib/market-integrity/market-memory";
import { persistMarketRows, getRiskLedgerStatus } from "@/lib/market-integrity/risk-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pages = Math.min(Math.max(Number(searchParams.get("pages") ?? "1"), 1), 4);
  const perPage = Math.min(Math.max(Number(searchParams.get("perPage") ?? "100"), 20), 250);

  try {
    const chunks = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        fetchCoinGeckoMarkets({ page: index + 1, perPage, vsCurrency: "usd" }),
      ),
    );
    const rows = recordMarketRows(chunks.flat());
    const ledger = await persistMarketRows(rows);
    const insights = buildSweepInsights(rows);
    const critical = rows.filter((row) => row.result.score >= 85).length;
    const high = rows.filter((row) => row.result.score >= 65 && row.result.score < 85).length;
    const rising = rows.filter((row) => row.memory?.trend === "rising_risk").length;

    return NextResponse.json({
      mode: "live",
      agent: "velmere-shield-market-sweep-bot-v1",
      source: "CoinGecko markets + Velmère in-memory risk ledger",
      rowsScanned: rows.length,
      pages,
      perPage,
      critical,
      high,
      rising,
      insights,
      memory: getMarketMemoryStatus(),
      ledger,
      ledgerStatus: await getRiskLedgerStatus(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Market sweep bot failed" },
      { status: 502 },
    );
  }
}
