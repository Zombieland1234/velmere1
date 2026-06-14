import { NextResponse } from "next/server";
import { searchCoinGeckoMarket } from "@/lib/market-integrity/coingecko";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { buildVlmShieldInvestigator } from "@/lib/market-integrity/shield-investigator";
import { buildEvidenceReportDraft } from "@/lib/market-integrity/evidence-report";
import { checkRateLimit, guardrailHeaders } from "@/lib/market-integrity/api-guardrails";
import { persistSourceSnapshot } from "@/lib/market-integrity/source-snapshot-ledger";
import { buildTerminalEvidenceExport } from "@/lib/market-integrity/terminal-evidence-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "vlm-shield-report";
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, "evidence-export");
  const baseHeaders = guardrailHeaders(rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Rate limit exceeded. Try again after cooldown." }, { status: 429, headers: baseHeaders });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const format = searchParams.get("format")?.trim().toLowerCase() === "json" ? "json" : "markdown";

  if (!query) {
    return NextResponse.json<ErrorPayload>({ mode: "error", error: "Missing query" }, { status: 400, headers: baseHeaders });
  }

  try {
    const marketRow = await searchCoinGeckoMarket(query);
    const result = marketRow?.result ?? await analyzeDexScreenerToken(query);
    const investigator = buildVlmShieldInvestigator(result);
    const evidenceReport = buildEvidenceReportDraft(result, investigator);
    const sourceSnapshot = await persistSourceSnapshot(result, investigator, evidenceReport);
    const terminalEvidenceExport = buildTerminalEvidenceExport(result, {
      activeCommand: "export",
      chartSource: "evidence-export-route",
      sessionMode: "operator_session",
      exportInfrastructureReady: false,
      persistentAuditLogReady: false,
      rateLimitMiddlewareReady: false,
    });
    const filename = safeFilename(`${evidenceReport.reportId}-${result.token.symbol}`);

    if (format === "json") {
      return new NextResponse(JSON.stringify({ mode: "draft", result, investigator, evidenceReport, sourceSnapshot, terminalEvidenceExport }, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}.json"`,
          ...baseHeaders,
        },
      });
    }

    return new NextResponse(evidenceReport.markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}.md"`,
        ...baseHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Evidence export failed" },
      { status: 502, headers: baseHeaders },
    );
  }
}
