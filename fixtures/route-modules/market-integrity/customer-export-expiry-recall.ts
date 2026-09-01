import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import { PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-expiry-recall-gate";
import { PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-redaction-packet-gate";
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
  const productionGuard = blockProductionFixtureRoute("customer-export-expiry-recall");
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
  const now = new Date();
  const expiryWindowMinutes = Number(url.searchParams.get("expiryWindowMinutes") ?? (tier === "Basic" ? 30 : tier === "Pro" ? 20 : 15));
  const issuedAt = url.searchParams.get("issuedAt") ?? now.toISOString();
  const issuedAtStamp = new Date(issuedAt).getTime();
  const safeIssuedAtStamp = Number.isFinite(issuedAtStamp) ? issuedAtStamp : now.getTime();
  const expiresAt = url.searchParams.get("expiresAt") ?? new Date(safeIssuedAtStamp + expiryWindowMinutes * 60000).toISOString();
  const recallRequested = bool(url.searchParams.get("recallRequested"));

  const payload = buildTop1PdfPayloadDraft({
    locale: "en",
    tier,
    symbol: url.searchParams.get("symbol") ?? "BTC",
    name: url.searchParams.get("name") ?? "Velmere customer export expiry recall sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["build/typecheck proof", "support attachment retention proof", "production email/API send proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2839-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2839-demo-source-root",
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
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2839_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2839_demo_receipt",
    remedyRedactedEvidencePacketReady: true,
    remedyManualFinanceReviewComplete: true,
    accountVaultAuditTrailId: url.searchParams.get("accountVaultAuditTrailId") ?? "vault_audit_pass2839",
    deliveryLedgerEntryId: url.searchParams.get("deliveryLedgerEntryId") ?? "delivery_ledger_pass2839",
    consumedTokenReceiptId: url.searchParams.get("consumedTokenReceiptId") ?? "token_consumed_pass2839",
    remedyDecisionId: url.searchParams.get("remedyDecisionId") ?? "remedy_decision_pass2839",
    reopenReceiptId: url.searchParams.get("reopenReceiptId") ?? "reopen_receipt_pass2839",
    replaySealId: url.searchParams.get("replaySealId") ?? "replay_seal_pass2839",
    replayLockId: url.searchParams.get("replayLockId") ?? "replay_lock_pass2839",
    newReportTokenHash: url.searchParams.get("newReportTokenHash") ?? "new_token_hash_pass2839",
    oldTokenRevocationReceiptId: url.searchParams.get("oldTokenRevocationReceiptId") ?? "old_token_revoked_pass2839",
    deliveryDedupKey: url.searchParams.get("deliveryDedupKey") ?? "dedup_pass2839",
    accountVaultTimelineHash: url.searchParams.get("accountVaultTimelineHash") ?? "timeline_pass2839",
    supportTicketId: url.searchParams.get("supportTicketId") ?? "support_ticket_pass2839",
    remedySlaPolicyId: url.searchParams.get("remedySlaPolicyId") ?? "sla_policy_pass2839",
    supportOwnerPseudonym: "ops-redacted",
    customerNoticeReceiptId: url.searchParams.get("customerNoticeReceiptId") ?? "notice_pass2839",
    supportPacketHash: url.searchParams.get("supportPacketHash") ?? "support_packet_pass2839",
    financeRemedyReceiptId: url.searchParams.get("financeRemedyReceiptId") ?? "finance_receipt_pass2839",
    deliveryReopenApprovedAt: url.searchParams.get("deliveryReopenApprovedAt") ?? now.toISOString(),
    supportActualFirstResponseHours: Number(url.searchParams.get("firstResponseHours") ?? 2),
    supportCurrentAgeHours: Number(url.searchParams.get("currentAgeHours") ?? 6),
    customerExportRequested: url.searchParams.get("exportRequested") !== "false",
    customerExportPacketId: url.searchParams.get("exportPacketId") ?? "export_packet_pass2839",
    customerExportChannel: safeCustomerExportChannel(url.searchParams.get("exportChannel")),
    customerDownloadId: url.searchParams.get("customerDownloadId") ?? "download_pass2839",
    customerEmailNoticeId: url.searchParams.get("emailNoticeId"),
    customerApiHandoffId: url.searchParams.get("apiHandoffId"),
    customerSupportCaseCloseReceiptId: url.searchParams.get("supportCaseCloseReceiptId"),
    customerRedactionManifestHash: url.searchParams.get("redactionManifestHash") ?? "redaction_manifest_pass2839",
    customerMinimizationPolicyId: url.searchParams.get("minimizationPolicyId") ?? "min_policy_pass2839",
    customerAckReceiptId: url.searchParams.get("customerAckReceiptId") ?? "ack_pass2839",
    customerExportAllIdsRedacted: url.searchParams.get("allIdsRedacted") !== "false",
    customerExportRawTokensRemoved: url.searchParams.get("rawTokensRemoved") !== "false",
    customerExportRawPaymentIdsRemoved: url.searchParams.get("rawPaymentIdsRemoved") !== "false",
    customerExportPrivateNotesRemoved: url.searchParams.get("privateNotesRemoved") !== "false",
    customerExportSupportMessagesSummarized: url.searchParams.get("supportMessagesSummarized") !== "false",
    customerExportPayloadHashBound: url.searchParams.get("payloadHashBound") !== "false",
    customerExportSourceReceiptRootBound: url.searchParams.get("sourceReceiptRootBound") !== "false",
    customerExportPayloadOrSourceRootDrift: bool(url.searchParams.get("payloadOrSourceRootDrift")),
    customerExportRevoked: bool(url.searchParams.get("exportRevoked")),
    customerExportActiveLinkId: url.searchParams.get("activeLinkId") ?? "active_link_pass2839",
    customerExportIssuedAt: issuedAt,
    customerExportExpiresAt: expiresAt,
    customerExportExpiryWindowMinutes: expiryWindowMinutes,
    customerExportRecallRequested: recallRequested,
    customerExportRecallReceiptId: url.searchParams.get("recallReceiptId") ?? (recallRequested ? "recall_receipt_pass2839" : null),
    customerExportResendRequested: bool(url.searchParams.get("resendRequested")),
    customerExportResendIdempotencyKey: url.searchParams.get("resendIdempotencyKey") ?? (bool(url.searchParams.get("resendRequested")) ? "resend_idempotency_pass2839" : null),
    customerExportRetryBudgetLimit: Number(url.searchParams.get("retryBudgetLimit") ?? 3),
    customerExportRetryBudgetUsed: Number(url.searchParams.get("retryBudgetUsed") ?? 0),
    customerExportSupportAttachmentRetentionHours: Number(url.searchParams.get("supportAttachmentRetentionHours") ?? 72),
    customerExportSupportAttachmentCreatedAt: url.searchParams.get("supportAttachmentCreatedAt") ?? now.toISOString(),
    customerExportAuditTimelineHash: url.searchParams.get("auditTimelineHash") ?? "export_audit_timeline_pass2839",
    customerExportExpiryPayloadOrSourceRootDrift: bool(url.searchParams.get("expiryPayloadOrSourceRootDrift")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2839,
      pass2839CustomerExportExpiryRecallGate: payload.customerExportExpiryRecallGate,
      pass2839CustomerExportExpiryRecallAcceptanceGates: PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES,
      pass2838LegacyCompatibility: { pass: 2838, rule: "PASS2838 redacted export packet must clear before PASS2839 expiry/recall can serve a customer link." },
      pass2838CustomerExportRedactionPacketGate: payload.customerExportRedactionPacketGate,
      pass2838CustomerExportRedactionPacketAcceptanceGates: PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
      customerSafeCopy: "Customer export links expire, can be recalled, use retry budgets and resend idempotency, and keep a timeline hash across account download, email notice, API handoff and support attachment.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
