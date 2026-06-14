import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildAttackSurface } from "@/lib/market-integrity/attack-playbook";
import { recordSingleResult } from "@/lib/market-integrity/market-memory";
import { persistRiskSnapshots } from "@/lib/market-integrity/risk-ledger";

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
    const attackSurface = buildAttackSurface(result);

    return NextResponse.json({
      mode: "live",
      reportType: "velmere-shield-attack-surface-playbook",
      result,
      memory,
      ledger,
      attackSurface,
      legalNote: "Automated risk-testing playbook. Not legal proof, not an accusation, not financial advice.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Playbook generation failed" },
      { status: 502 },
    );
  }
}
