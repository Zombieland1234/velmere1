import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildRiskBrain } from "@/lib/market-integrity/risk-brain";
import { recordSingleResult } from "@/lib/market-integrity/market-memory";
import { getPersistentRiskHistory, persistRiskSnapshots } from "@/lib/market-integrity/risk-ledger";
import { generateVlmBrainAnalysis } from "@/lib/ai/vlm-brain";
import { getVlmPaidProduct, normalizePaidContext } from "@/lib/commerce/pass2024-vlm-paid-access";
import { verifyVlmPaidAccessEntitlement } from "@/lib/commerce/pass2025-vlm-entitlement-ledger";

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
    const memory = recordSingleResult(result);
    const ledger = memory?.lastSnapshot ? await persistRiskSnapshots([memory.lastSnapshot]) : undefined;
    const id = result.token.marketId ?? result.token.tokenAddress ?? result.token.symbol;
    const history = await getPersistentRiskHistory(id);
    const brain = buildRiskBrain(result, history);
    const locale = searchParams.get("locale") === "en" || searchParams.get("locale") === "de" ? searchParams.get("locale") as "en" | "de" : "pl";
    const depth = searchParams.get("depth") === "basic" || searchParams.get("depth") === "pro" ? searchParams.get("depth") as "basic" | "pro" : "advanced";
    if (depth === "advanced") {
      const paidContext = normalizePaidContext({
        surface: "shield",
        locale,
        assetId: query,
        symbol: query,
        depth,
      }, locale);
      const paidVerdict = await verifyVlmPaidAccessEntitlement({
        token: request.headers.get("x-velmere-paid-access"),
        productId: "vlm_advanced_analysis_single",
        context: paidContext,
      });
      if (!paidVerdict.ok) {
        return NextResponse.json({
          mode: "error",
          error: "payment_required",
          product: getVlmPaidProduct("vlm_advanced_analysis_single", locale),
          context: paidContext,
          reason: paidVerdict.error,
          ledgerMode: paidVerdict.ledgerMode,
        }, { status: 402, headers: { "x-velmere-paid-access-required": "vlm_advanced_analysis_single" } });
      }
    }
    const ai = await generateVlmBrainAnalysis({
      result,
      brain,
      locale,
      depth,
      surface: "shield",
      prompt: searchParams.get("prompt")?.trim() || undefined,
    });

    return NextResponse.json({
      mode: "live",
      result,
      memory,
      ledger,
      history,
      brain,
      ai,
      pass425: brain.pass425,
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
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Risk brain generation failed" },
      { status: 502 },
    );
  }
}
