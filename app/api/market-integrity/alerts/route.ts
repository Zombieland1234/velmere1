import { NextResponse } from "next/server";
import { getAlertLedgerStatus, getPersistentAlertInbox } from "@/lib/market-integrity/alert-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorPayload = { mode: "error"; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 100);

  try {
    const [alerts, ledger] = await Promise.all([
      getPersistentAlertInbox(limit),
      getAlertLedgerStatus(),
    ]);

    return NextResponse.json({
      mode: "live",
      agent: "velmere-shield-case-inbox-v1",
      alerts,
      ledger,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<ErrorPayload>(
      { mode: "error", error: error instanceof Error ? error.message : "Alert inbox failed" },
      { status: 502 },
    );
  }
}
