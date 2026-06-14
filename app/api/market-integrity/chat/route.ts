import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildShieldChatResponse } from "@/lib/market-integrity/shield-chat";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { buildEvidenceReportDraft } from "@/lib/market-integrity/evidence-report";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { buildPass426AngelResponse } from "@/lib/market-integrity/pass426-angel-provider-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const prompt = searchParams.get("prompt")?.trim() || "Explain the current risk.";
  const localeCandidate = searchParams.get("locale")?.trim() || "pl";
  const locale = localeCandidate === "de" || localeCandidate === "en" ? localeCandidate : "pl";
  if (!query) return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400 });

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const answer = buildShieldChatResponse(result, history, prompt, locale);
    const brain = buildRiskBrain(result, history);
    const angel = await buildPass426AngelResponse({ result, brain: brain.pass422, deterministic: answer, prompt, locale });
    const investigator = buildVlmShieldInvestigator(result);
    const evidenceReport = buildEvidenceReportDraft(result, investigator);

    return NextResponse.json({
      mode: "live",
      answer,
      angel,
      pass426: angel,
      pass427: brain.pass427,
        pass428: brain.pass428,
        pass429: brain.pass429,
        pass430: brain.pass430,
        pass431: brain.pass431,
        pass432: brain.pass432,
        pass433: brain.pass433,
        pass434: brain.pass434,
        pass435: brain.pass435,
        pass436: brain.pass436,
        pass437: brain.pass437,
        pass438: brain.pass438,
        pass439: brain.pass439,
        pass440: brain.pass440,
        pass441: brain.pass441,
        pass442: brain.pass442,
      brain,
      investigator,
      evidenceReport,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Shield chat request failed" },
      { status: 502 },
    );
  }
}
