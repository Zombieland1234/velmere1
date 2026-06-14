import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildEvidenceWorkflow } from "@/lib/market-integrity/evidence-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const evidenceWorkflow = buildEvidenceWorkflow(result, {
      historyCount: history.length,
      candlesCount: result.chart?.sevenDay?.length ?? 0,
      chartSource: result.chart?.sevenDay?.length ? "result.chart.sevenDay" : "market metrics",
      activeCommand: searchParams.get("command") ?? "risk",
    });

    return NextResponse.json({
      mode: "live",
      result,
      history,
      evidenceWorkflow,
      legalNote: "Not financial advice. Algorithmic risk flag only. Evidence workflow is not legal proof or an accusation.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Evidence workflow generation failed" },
      { status: 502 },
    );
  }
}
