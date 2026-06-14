import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { getPersistentRiskHistory } from "@/lib/market-integrity/risk-ledger";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { checkRateLimit, guardrailHeaders } from "@/lib/market-integrity/api-guardrails";
import { buildEvidenceReportDraft } from "@/lib/market-integrity/evidence-report";
import { persistSourceSnapshot } from "@/lib/market-integrity/source-snapshot-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, "investigator");
  const headers = guardrailHeaders(rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Rate limit exceeded. Try again after cooldown." }, { status: 429, headers });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const localeCandidate = searchParams.get("locale")?.trim();
  const locale =
    localeCandidate === "de" || localeCandidate === "en"
      ? localeCandidate
      : "pl";

  if (!query) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400, headers });
  }

  try {
    let result: Awaited<ReturnType<typeof analyzeDexScreenerToken>>;
    try {
      const marketRow = await searchCoinGeckoMarket(query);
      result = marketRow?.result ?? (await analyzeDexScreenerToken(query));
    } catch {
      result = await analyzeDexScreenerToken(query);
    }
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id, 144);
    const investigator = buildVlmShieldInvestigator(result);
    const evidenceReport = buildEvidenceReportDraft(result, investigator);
    const sourceSnapshot = await persistSourceSnapshot(result, investigator, evidenceReport);

    return NextResponse.json({
      mode: "live",
      investigator,
      evidenceReport,
      sourceSnapshot,
      result,
      history,
      generatedAt: new Date().toISOString(),
      engine: {
        marketData: "live",
        riskEngine: "connected",
        generativeNarrative: process.env.VELMERE_ANGEL_PROVIDER
          ? "configured"
          : "not_configured",
        webOsint: "not_connected",
        locale,
      },
      note: "This endpoint prepares the VLM Shield Investigator protocol and current market-data context. Full OSINT verdict still requires current web search against the provided queries.",
      guardrails: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    }, { headers });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "VLM Shield Investigator request failed" },
      { status: 502, headers },
    );
  }
}
