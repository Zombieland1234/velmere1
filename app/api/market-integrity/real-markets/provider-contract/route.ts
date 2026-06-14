import { NextResponse } from "next/server";
import { buildRealMarketProviderContract } from "@/lib/market-integrity/real-market-provider-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const contract = buildRealMarketProviderContract();
  return NextResponse.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      ...contract,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
