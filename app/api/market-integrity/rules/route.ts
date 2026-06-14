import { NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/lib/market-integrity/coingecko";
import { getMarketMemoryStatus, recordMarketRows } from "@/lib/market-integrity/market-memory";
import { buildShieldRuleHits } from "@/lib/market-integrity/rule-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pages = Math.min(Math.max(Number(searchParams.get("pages") ?? "1"), 1), 4);
  const perPage = Math.min(Math.max(Number(searchParams.get("perPage") ?? "120"), 20), 250);
  const watchlist = searchParams.get("watchlist");

  try {
    const chunks = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        fetchCoinGeckoMarkets({ page: index + 1, perPage, vsCurrency: "usd" }),
      ),
    );
    const rows = recordMarketRows(chunks.flat());
    const rules = buildShieldRuleHits(rows, watchlist);

    return NextResponse.json({
      mode: "live",
      agent: "velmere-shield-rules-engine-v1",
      source: "CoinGecko markets + Velmère risk memory + deterministic alert rules",
      rowsScanned: rows.length,
      rules,
      memory: getMarketMemoryStatus(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Shield rules engine failed" },
      { status: 502 },
    );
  }
}
