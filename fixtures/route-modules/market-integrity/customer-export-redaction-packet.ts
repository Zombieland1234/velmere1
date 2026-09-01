import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import { PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-redaction-packet-gate";
import { PASS2837_SUPPORT_SLA_REMEDY_PROOF_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-support-sla-remedy-proof-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { safeCustomerExportChannel } from "@/lib/market-integrity/customer-export-route-literals";

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
  const productionGuard = blockProductionFixtureRoute("customer-export-redaction-packet");
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
    name: url.searchParams.get("name") ?? "Velmere customer export redaction packet sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["build/typecheck proof", "support SLA proof", "customer export packet proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2838-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2838-demo-source-root",
    incidentDetected: bool(url.searchParams.get("incidentDetected")) || bool(url.searchParams.get("deliveryFailure")),
    incidentPaidEvidenceAffected: bool(url.searchParams.get("paidEvidenceAffected")) || bool(url.searchParams.get("deliveryFailure")),
    incidentCustomerImpactCount: Number(url.searchParams.get("customerImpactCount") ?? (bool(url.searchParams.get("deliveryFailure")) ? 1 : 0)),
    incidentCustomerNoticeDrafted: true,
    incidentCustomerNoticeSent: true,
    incidentSupportQueueReady: true,
    incidentPostmortemCompleted: bool(url.searchParams.get("postmortemCompleted")),
    remedyPaidOrderAffected: true,
    remedyRefundRequested: bool(url.searchParams.get("refundRequested")),
    remedyRefundApproved: bool(url.searchParams.get("refundApproved")),
    remedyCreditIssued: bool(url.searchParams.get("creditIssued")),
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2838_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2838_demo_receipt",
    remedyRedactedEvidencePacketReady: true,
    remedyManualFinanceReviewComplete: true,
    accountVaultAuditTrailId: url.searchParams.get("accountVaultAuditTrailId") ?? "vault_audit_pass2838",
    deliveryLedgerEntryId: url.searchParams.get("deliveryLedgerEntryId") ?? "delivery_ledger_pass2838",
    consumedTokenReceiptId: url.searchParams.get("consumedTokenReceiptId") ?? "token_consumed_pass2838",
    remedyDecisionId: url.searchParams.get("remedyDecisionId") ?? "remedy_decision_pass2838",
    reopenReceiptId: url.searchParams.get("reopenReceiptId") ?? "reopen_receipt_pass2838",
    replaySealId: url.searchParams.get("replaySealId") ?? "replay_seal_pass2838",
    replayLockId: url.searchParams.get("replayLockId") ?? "replay_lock_pass2838",
    newReportTokenHash: url.searchParams.get("newReportTokenHash") ?? "new_token_hash_pass2838",
    oldTokenRevocationReceiptId: url.searchParams.get("oldTokenRevocationReceiptId") ?? "old_token_revoked_pass2838",
    deliveryDedupKey: url.searchParams.get("deliveryDedupKey") ?? "dedup_pass2838",
    accountVaultTimelineHash: url.searchParams.get("accountVaultTimelineHash") ?? "timeline_pass2838",
    supportTicketId: url.searchParams.get("supportTicketId") ?? "support_ticket_pass2838",
    remedySlaPolicyId: url.searchParams.get("remedySlaPolicyId") ?? "sla_policy_pass2838",
    supportOwnerPseudonym: "ops-redacted",
    customerNoticeReceiptId: url.searchParams.get("customerNoticeReceiptId") ?? "notice_pass2838",
    supportPacketHash: url.searchParams.get("supportPacketHash") ?? "support_packet_pass2838",
    financeRemedyReceiptId: url.searchParams.get("financeRemedyReceiptId") ?? "finance_receipt_pass2838",
    deliveryReopenApprovedAt: url.searchParams.get("deliveryReopenApprovedAt") ?? new Date().toISOString(),
    supportActualFirstResponseHours: Number(url.searchParams.get("firstResponseHours") ?? 2),
    supportCurrentAgeHours: Number(url.searchParams.get("currentAgeHours") ?? 6),
    customerExportRequested: url.searchParams.get("exportRequested") !== "false",
    customerExportPacketId: url.searchParams.get("exportPacketId") ?? "export_packet_pass2838",
    customerExportChannel: safeCustomerExportChannel(url.searchParams.get("exportChannel")),
    customerDownloadId: url.searchParams.get("customerDownloadId") ?? "download_pass2838",
    customerEmailNoticeId: url.searchParams.get("emailNoticeId"),
    customerApiHandoffId: url.searchParams.get("apiHandoffId"),
    customerSupportCaseCloseReceiptId: url.searchParams.get("supportCaseCloseReceiptId"),
    customerRedactionManifestHash: url.searchParams.get("redactionManifestHash") ?? "redaction_manifest_pass2838",
    customerMinimizationPolicyId: url.searchParams.get("minimizationPolicyId") ?? "min_policy_pass2838",
    customerAckReceiptId: url.searchParams.get("customerAckReceiptId") ?? "ack_pass2838",
    customerExportAllIdsRedacted: url.searchParams.get("allIdsRedacted") !== "false",
    customerExportRawTokensRemoved: url.searchParams.get("rawTokensRemoved") !== "false",
    customerExportRawPaymentIdsRemoved: url.searchParams.get("rawPaymentIdsRemoved") !== "false",
    customerExportPrivateNotesRemoved: url.searchParams.get("privateNotesRemoved") !== "false",
    customerExportSupportMessagesSummarized: url.searchParams.get("supportMessagesSummarized") !== "false",
    customerExportPayloadHashBound: url.searchParams.get("payloadHashBound") !== "false",
    customerExportSourceReceiptRootBound: url.searchParams.get("sourceReceiptRootBound") !== "false",
    customerExportPayloadOrSourceRootDrift: bool(url.searchParams.get("payloadOrSourceRootDrift")),
    customerExportRevoked: bool(url.searchParams.get("exportRevoked")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2838,
      pass2838CustomerExportRedactionPacketGate: payload.customerExportRedactionPacketGate,
      pass2838CustomerExportRedactionPacketAcceptanceGates: PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
      pass2837LegacyCompatibility: { pass: 2837, rule: "PASS2837 support SLA/remedy proof must clear before PASS2838 customer export packets can be delivered." },
      pass2837SupportSlaRemedyProofGate: payload.supportSlaRemedyProofGate,
      pass2837SupportSlaRemedyProofAcceptanceGates: PASS2837_SUPPORT_SLA_REMEDY_PROOF_ACCEPTANCE_GATES,
      customerSafeCopy: "Customer export is not the same as support close. Account download, email notice, API handoff and support attachment require their own redacted export packet, channel receipt, minimization policy and payload/source/support-SLA binding.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
