import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_AUDIT_PDF_WITHHELD = {
  ok: false,
  mode: "withheld",
  error: "evidence_bound_audit_pdf_required",
  reason:
    "The legacy audit PDF route could derive customer report content from benchmark/profile data and tier query parameters without a complete exact-scope evidence contract. It is disabled until the release-derived evidence-bound report path is available.",
  customerImpact:
    "No PDF is emitted and no paid or benchmark tier is inferred from query parameters while the safe generator is being rebuilt.",
  retryable: false,
  releaseCredit: false,
} as const;

export async function GET() {
  return NextResponse.json(LEGACY_AUDIT_PDF_WITHHELD, {
    status: 503,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-velmere-audit-pdf-state": "withheld",
    },
  });
}
