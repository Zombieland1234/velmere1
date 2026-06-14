import { NextResponse } from "next/server";
import { getMarketHistory } from "@/lib/market-integrity/market-memory";
import { getPersistentRiskHistory, getRiskLedgerStatus } from "@/lib/market-integrity/risk-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dedupeHistory<T extends { timestamp: string }>(items: T[]) {
  const byTimestamp = new Map<string, T>();
  for (const item of items) byTimestamp.set(item.timestamp, item);
  return Array.from(byTimestamp.values()).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "144"), 1), 500);
  if (!id) return NextResponse.json({ mode: "error", error: "Missing token id" }, { status: 400 });

  const memoryHistory = getMarketHistory(id);
  const persistentHistory = await getPersistentRiskHistory(id, limit);
  const history = dedupeHistory([...memoryHistory, ...persistentHistory]).slice(-limit);

  return NextResponse.json({
    mode: "live",
    id,
    history,
    observations: history.length,
    ledger: await getRiskLedgerStatus(),
    generatedAt: new Date().toISOString(),
  });
}
