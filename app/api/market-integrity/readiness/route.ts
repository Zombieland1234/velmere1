import { NextResponse } from "next/server";
import { getSourceSnapshotLedgerMeta } from "@/lib/market-integrity/source-snapshot-ledger";
import { buildTerminalReadiness } from "@/lib/market-integrity/terminal-readiness";
import { analyzeDexScreenerToken } from "@/lib/market-integrity/dexscreener";
import { noStoreHeaders } from "@/lib/market-integrity/api-guardrails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasEnv(name: string) {
  return Boolean(process.env[name]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "BTC";
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  );

  const checks = [
    {
      id: "supabase-source-snapshots",
      state: supabaseConfigured ? "ready" : "partial",
      body: supabaseConfigured
        ? "Supabase service role is configured for persistent source snapshots."
        : "Using in-memory source snapshots. This is not durable across server restarts.",
    },
    {
      id: "api-guardrails",
      state: "ready",
      body: "Investigator, evidence export and source snapshot endpoints have in-memory rate-limit guardrails.",
    },
    {
      id: "web-osint",
      state: "blocked",
      body: "Fresh web OSINT adapter is not wired yet. Reports remain drafts until current sources are attached.",
    },
    {
      id: "wallet-gating",
      state: hasEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID") ? "partial" : "blocked",
      body: "VLM member gating still requires wallet/session policy and production limits.",
    },
    {
      id: "evidence-export",
      state: "partial",
      body: "Markdown/JSON draft export exists. PDF renderer and redaction policy are still missing.",
    },
  ];

  const ready = checks.filter((check) => check.state === "ready").length;
  const score = Math.round((ready / checks.length) * 100);
  let terminalReadiness: ReturnType<typeof buildTerminalReadiness> | null = null;
  try {
    const result = await analyzeDexScreenerToken(query);
    terminalReadiness = buildTerminalReadiness(result, {
      chartSource: "readiness endpoint",
      accessLayerVisible: true,
      chatEnabled: true,
    });
  } catch {
    terminalReadiness = null;
  }

  return NextResponse.json({
    mode: "live",
    score,
    checks,
    terminalReadiness,
    sourceSnapshots: getSourceSnapshotLedgerMeta(),
    generatedAt: new Date().toISOString(),
  }, { headers: noStoreHeaders() });
}
