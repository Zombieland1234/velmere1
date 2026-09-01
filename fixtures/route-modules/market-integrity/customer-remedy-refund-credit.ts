import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import { PASS2834_CUSTOMER_REMEDY_REFUND_CREDIT_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-remedy-refund-credit-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "passed" || value === "yes";
}

function tierFrom(value: string | null): VelmereTier {
  const normalized = (value ?? "Advanced").toLowerCase();
  if (normalized === "basic") return "Basic";
  if (normalized === "pro") return "Pro";
  return "Advanced";
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-remedy-refund-credit");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const tier = tierFrom(url.searchParams.get("tier"));
  const riskScore = parseRiskScore(url.searchParams.get("risk"));
  if (riskScore === null) {
    return NextResponse.json(
      { ok: false, code: RISK_SCORE_UNAVAILABLE_CODE, field: "risk", state: "unavailable" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  const payload = buildTop1PdfPayloadDraft({
    locale: "en",
    tier,
    symbol: url.searchParams.get("symbol") ?? "BTC",
    name: url.searchParams.get("name") ?? "Velmere remedy sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["build/typecheck proof", "customer delivery proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2834-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2834-demo-source-root",
    canaryEntitlementErrorCount: bool(url.searchParams.get("entitlementError")) ? 1 : 0,
    canaryCustomerDeliveryFailureCount: bool(url.searchParams.get("deliveryFailure")) ? 1 : 0,
    incidentDetected: bool(url.searchParams.get("incidentDetected")) || bool(url.searchParams.get("deliveryFailure")),
    incidentPaidEvidenceAffected: bool(url.searchParams.get("paidEvidenceAffected")) || bool(url.searchParams.get("deliveryFailure")),
    incidentCustomerImpactCount: Number(url.searchParams.get("customerImpactCount") ?? (bool(url.searchParams.get("deliveryFailure")) ? 1 : 0)),
    incidentCustomerNoticeDrafted: bool(url.searchParams.get("noticeDrafted")),
    incidentCustomerNoticeSent: bool(url.searchParams.get("noticeSent")),
    incidentSupportQueueReady: bool(url.searchParams.get("supportReady")),
    incidentPostmortemCompleted: bool(url.searchParams.get("postmortemCompleted")),
    remedyPaidOrderAffected: bool(url.searchParams.get("paidOrderAffected")) || bool(url.searchParams.get("deliveryFailure")),
    remedyDeliveryFailed: bool(url.searchParams.get("deliveryFailure")),
    remedyDuplicateChargeSuspected: bool(url.searchParams.get("duplicateCharge")),
    remedyRefundRequested: bool(url.searchParams.get("refundRequested")),
    remedyRefundApproved: bool(url.searchParams.get("refundApproved")),
    remedyCreditIssued: bool(url.searchParams.get("creditIssued")),
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2834_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2834_demo_receipt",
    remedyAffectedAccountRefRedacted: url.searchParams.get("accountRedacted") !== "false",
    remedyRedactedEvidencePacketReady: bool(url.searchParams.get("evidencePacketReady")),
    remedyManualFinanceReviewComplete: bool(url.searchParams.get("financeReviewComplete")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2834,
      pass2834CustomerRemedyRefundCreditGate: payload.customerRemedyRefundCreditGate,
      pass2834CustomerRemedyRefundCreditAcceptanceGates: PASS2834_CUSTOMER_REMEDY_REFUND_CREDIT_ACCEPTANCE_GATES,
      pass2834CustomerRemedyRule: "Customer remedy/refund/credit decisions require redacted support evidence and finance review; incident notice/postmortem alone cannot reopen paid delivery.",
      linkedIncidentGate: payload.incidentDisclosureResponseGate,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
