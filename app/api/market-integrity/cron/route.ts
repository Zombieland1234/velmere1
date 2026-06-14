import { NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/lib/market-integrity/coingecko";
import { buildSweepInsights, getMarketMemoryStatus, recordMarketRows } from "@/lib/market-integrity/market-memory";
import { getRiskLedgerStatus, persistMarketRows } from "@/lib/market-integrity/risk-ledger";
import { buildSentinelAlerts } from "@/lib/market-integrity/risk-alerts";
import { persistSentinelAlerts } from "@/lib/market-integrity/alert-ledger";
import { buildShieldRuleHits } from "@/lib/market-integrity/rule-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

function isAuthorized(request: Request) {
  const secret = process.env.MARKET_INTEGRITY_CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  const cronHeader = request.headers.get("x-vercel-cron") ?? "";
  return auth === `Bearer ${secret}` || cronHeader === "1" || cronHeader.toLowerCase() === "true";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Unauthorized cron sweep" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pages = Math.min(Math.max(Number(searchParams.get("pages") ?? "2"), 1), 6);
  const perPage = Math.min(Math.max(Number(searchParams.get("perPage") ?? "100"), 25), 250);
  const startedAt = new Date().toISOString();

  try {
    const chunks = [];
    for (let page = 1; page <= pages; page += 1) {
      chunks.push(await fetchCoinGeckoMarkets({ page, perPage, vsCurrency: "usd" }));
    }
    const rows = recordMarketRows(chunks.flat());
    const ledger = await persistMarketRows(rows);
    const insights = buildSweepInsights(rows);
    const sentinelAlerts = buildSentinelAlerts(rows);
    const alertLedger = await persistSentinelAlerts(sentinelAlerts);
    const rules = buildShieldRuleHits(rows, searchParams.get("watchlist"));
    const critical = rows.filter((row) => row.result.score >= 85).length;
    const high = rows.filter((row) => row.result.score >= 65 && row.result.score < 85).length;
    const rising = rows.filter((row) => row.memory?.trend === "rising_risk").length;

    return NextResponse.json({
      mode: "live",
      agent: "velmere-shield-cron-market-sweep-v2",
      startedAt,
      generatedAt: new Date().toISOString(),
      pages,
      perPage,
      rowsScanned: rows.length,
      critical,
      high,
      rising,
      ledger,
      alertLedger,
      sentinelAlerts,
      rules,
      memory: getMarketMemoryStatus(),
      ledgerStatus: await getRiskLedgerStatus(),
      insights,
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Cron market sweep failed" },
      { status: 502 },
    );
  }
}
