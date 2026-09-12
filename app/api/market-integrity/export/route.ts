import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_EXPORT_WITHHELD = {
  schemaVersion: "velmere.r11.legacy-export-withheld.v1",
  mode: "withheld",
  availability: "WITHHELD",
  error: "server_bound_report_required",
  reason:
    "Legacy export accepted client-controlled analytical values and cannot establish evidence provenance. Export is withheld until a server-bound report artifact with exact-scope evidence is supplied.",
  integrityBoundary:
    "No customer-supplied risk score, confidence, price, signal state, timestamp claim, certification claim, or payment hint is accepted as report authority.",
  releaseCredit: false,
} as const;

function withheldResponse() {
  return NextResponse.json(LEGACY_EXPORT_WITHHELD, {
    status: 503,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "x-velmere-export-state": "withheld",
    },
  });
}

export async function GET() {
  return withheldResponse();
}

export async function POST() {
  return withheldResponse();
}
