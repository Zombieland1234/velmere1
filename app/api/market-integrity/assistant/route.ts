import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildAiRiskBotBrief } from "@/lib/market-integrity/ai-risk-bot";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { buildEvidenceReportDraft } from "@/lib/market-integrity/evidence-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });
  }

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const assistant = buildAiRiskBotBrief(result, history);
    const investigator = buildVlmShieldInvestigator(result);
    const evidenceReport = buildEvidenceReportDraft(result, investigator);

    return NextResponse.json({
      mode: "live",
      assistant,
      investigator,
      evidenceReport,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "AI risk bot request failed" },
      { status: 502 },
    );
  }
}
