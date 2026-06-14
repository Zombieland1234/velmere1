import { NextResponse } from "next/server";
import { fetchCoinGeckoMarkets } from "@/lib/market-integrity/coingecko";
import { recordMarketRows, getMarketMemoryStatus } from "@/lib/market-integrity/market-memory";
import { buildSentinelAlerts } from "@/lib/market-integrity/risk-alerts";
import { getAlertLedgerStatus, getPersistentAlertInbox, persistSentinelAlerts } from "@/lib/market-integrity/alert-ledger";
import { buildShieldRuleHits } from "@/lib/market-integrity/rule-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pages = Math.min(Math.max(Number(searchParams.get("pages") ?? "1"), 1), 4);
  const perPage = Math.min(Math.max(Number(searchParams.get("perPage") ?? "100"), 20), 250);
  const watchlist = searchParams.get("watchlist");

  try {
    const chunks = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        fetchCoinGeckoMarkets({ page: index + 1, perPage, vsCurrency: "usd" }),
      ),
    );
    const rows = recordMarketRows(chunks.flat());
    const alerts = buildSentinelAlerts(rows);
    const rules = buildShieldRuleHits(rows, watchlist);
    const alertLedger = await persistSentinelAlerts(alerts);
    const inbox = await getPersistentAlertInbox(20);
    const alertStatus = await getAlertLedgerStatus();
    const critical = alerts.filter((alert) => alert.type === "critical_cluster").length;
    const rising = alerts.filter((alert) => alert.type === "rising_risk").length;
    const pump = alerts.filter((alert) => alert.type === "parabolic_pump").length;

    return NextResponse.json({
      mode: "live",
      agent: "velmere-shield-sentinel-agent-v1",
      source: "CoinGecko markets + Velmère multi-agent risk engine + in-memory/persistent ledger bridge",
      rowsScanned: rows.length,
      critical,
      rising,
      pump,
      alerts,
      inbox,
      alertLedger,
      alertStatus,
      rules,
      memory: getMarketMemoryStatus(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Shield sentinel failed" },
      { status: 502 },
    );
  }
}
