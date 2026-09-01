import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import {
  PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
} from "@/lib/market-integrity/top1-customer-export-redaction-packet-gate";
import {
  PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES,
} from "@/lib/market-integrity/top1-customer-export-expiry-recall-gate";
import {
  PASS2840_CUSTOMER_EXPORT_DELIVERY_LEDGER_PERSISTENCE_ACCEPTANCE_GATES,
} from "@/lib/market-integrity/top1-customer-export-delivery-ledger-persistence-gate";
import {
  PASS2841_CUSTOMER_EXPORT_ACK_SIGNED_RECEIPT_ACCEPTANCE_GATES,
} from "@/lib/market-integrity/top1-customer-export-ack-signed-receipt-gate";
import {
  PASS2842_CUSTOMER_EXPORT_DISPUTE_CHARGEBACK_HOLD_ACCEPTANCE_GATES,
} from "@/lib/market-integrity/top1-customer-export-dispute-chargeback-hold-gate";
import { safeCustomerExportLedgerChannel, safeCustomerExportAckChannel, safeCustomerExportLedgerStatus, safeCustomerExportHoldReason } from "@/lib/market-integrity/customer-export-route-literals";

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
  const productionGuard = blockProductionFixtureRoute("customer-export-dispute-chargeback-hold");
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
  const acknowledgementExpiresAt = url.searchParams.get("ackExpiresAt") ?? new Date(now.getTime() + 10 * 60000).toISOString();
  const channel = safeCustomerExportLedgerChannel(url.searchParams.get("ledgerChannel"));
  const ackChannel = safeCustomerExportAckChannel(url.searchParams.get("ackChannel"));

  const payload = buildTop1PdfPayloadDraft({
    locale: "en",
    tier,
    symbol: url.searchParams.get("symbol") ?? "BTC",
    name: url.searchParams.get("name") ?? "Velmere customer export dispute chargeback hold sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["production acknowledgement UI screenshot", "transactional email send proof", "customer-signature live verification proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2842-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2842-demo-source-root",
    incidentCustomerNoticeDrafted: true,
    incidentCustomerNoticeSent: true,
    incidentSupportQueueReady: true,
    remedyPaidOrderAffected: true,
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2842_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2842_demo_receipt",
    remedyRedactedEvidencePacketReady: true,
    remedyManualFinanceReviewComplete: true,
    accountVaultAuditTrailId: url.searchParams.get("accountVaultAuditTrailId") ?? "vault_audit_pass2842",
    deliveryLedgerEntryId: url.searchParams.get("deliveryLedgerEntryId") ?? "delivery_ledger_pass2842",
    consumedTokenReceiptId: url.searchParams.get("consumedTokenReceiptId") ?? "token_consumed_pass2842",
    remedyDecisionId: url.searchParams.get("remedyDecisionId") ?? "remedy_decision_pass2842",
    reopenReceiptId: url.searchParams.get("reopenReceiptId") ?? "reopen_receipt_pass2842",
    replaySealId: url.searchParams.get("replaySealId") ?? "replay_seal_pass2842",
    replayLockId: url.searchParams.get("replayLockId") ?? "replay_lock_pass2842",
    newReportTokenHash: url.searchParams.get("newReportTokenHash") ?? "new_token_hash_pass2842",
    oldTokenRevocationReceiptId: url.searchParams.get("oldTokenRevocationReceiptId") ?? "old_token_revoked_pass2842",
    deliveryDedupKey: url.searchParams.get("deliveryDedupKey") ?? "dedup_pass2842",
    accountVaultTimelineHash: url.searchParams.get("accountVaultTimelineHash") ?? "timeline_pass2842",
    supportTicketId: url.searchParams.get("supportTicketId") ?? "support_ticket_pass2842",
    remedySlaPolicyId: url.searchParams.get("remedySlaPolicyId") ?? "sla_policy_pass2842",
    supportOwnerPseudonym: "ops-redacted",
    customerNoticeReceiptId: url.searchParams.get("customerNoticeReceiptId") ?? "notice_pass2842",
    supportPacketHash: url.searchParams.get("supportPacketHash") ?? "support_packet_pass2842",
    financeRemedyReceiptId: url.searchParams.get("financeRemedyReceiptId") ?? "finance_receipt_pass2842",
    deliveryReopenApprovedAt: url.searchParams.get("deliveryReopenApprovedAt") ?? now.toISOString(),
    supportActualFirstResponseHours: Number(url.searchParams.get("firstResponseHours") ?? 2),
    supportCurrentAgeHours: Number(url.searchParams.get("currentAgeHours") ?? 6),
    customerExportRequested: true,
    customerExportPacketId: url.searchParams.get("exportPacketId") ?? "export_packet_pass2842",
    customerExportChannel: "account_download",
    customerDownloadId: url.searchParams.get("customerDownloadId") ?? "download_pass2842",
    customerRedactionManifestHash: url.searchParams.get("redactionManifestHash") ?? "redaction_manifest_pass2842",
    customerMinimizationPolicyId: url.searchParams.get("minimizationPolicyId") ?? "min_policy_pass2842",
    customerAckReceiptId: url.searchParams.get("customerAckReceiptId") ?? "ack_pass2842",
    customerExportPayloadHashBound: true,
    customerExportSourceReceiptRootBound: true,
    customerExportActiveLinkId: url.searchParams.get("activeLinkId") ?? "active_link_pass2842",
    customerExportIssuedAt: issuedAt,
    customerExportExpiresAt: expiresAt,
    customerExportExpiryWindowMinutes: expiryWindowMinutes,
    customerExportRecallRequested: bool(url.searchParams.get("recallRequested")),
    customerExportRecallReceiptId: url.searchParams.get("recallReceiptId") ?? (bool(url.searchParams.get("recallRequested")) ? "recall_receipt_pass2842" : null),
    customerExportResendRequested: bool(url.searchParams.get("resendRequested")),
    customerExportResendIdempotencyKey: url.searchParams.get("resendIdempotencyKey") ?? (bool(url.searchParams.get("resendRequested")) ? "resend_idempotency_pass2842" : null),
    customerExportRetryBudgetLimit: Number(url.searchParams.get("retryBudgetLimit") ?? 3),
    customerExportRetryBudgetUsed: Number(url.searchParams.get("retryBudgetUsed") ?? 0),
    customerExportSupportAttachmentRetentionHours: Number(url.searchParams.get("supportAttachmentRetentionHours") ?? 72),
    customerExportSupportAttachmentCreatedAt: url.searchParams.get("supportAttachmentCreatedAt") ?? now.toISOString(),
    customerExportAuditTimelineHash: url.searchParams.get("auditTimelineHash") ?? "export_audit_timeline_pass2842",
    customerExportLedgerRowId: url.searchParams.get("exportLedgerRowId") ?? "export_ledger_row_pass2842",
    customerExportLedgerPayloadHash: url.searchParams.get("ledgerPayloadHash") ?? "pass2842-demo-payload-hash",
    customerExportLedgerSourceReceiptRoot: url.searchParams.get("ledgerSourceReceiptRoot") ?? "pass2842-demo-source-root",
    customerExportLedgerSupportSlaTicketId: url.searchParams.get("ledgerSupportSlaTicketId") ?? "support_ticket_pass2842",
    customerExportLedgerStatus: safeCustomerExportLedgerStatus(url.searchParams.get("ledgerStatus")),
    customerExportLedgerRequestedChannel: channel,
    customerExportLinkStorageAdapterReady: url.searchParams.get("linkStorageAdapterReady") !== "false",
    customerExportRecallTimelineStoreReady: url.searchParams.get("recallTimelineStoreReady") !== "false",
    customerExportResendIdempotencyStoreReady: url.searchParams.get("resendIdempotencyStoreReady") !== "false",
    customerExportRetryBudgetCounterAtomic: url.searchParams.get("retryBudgetCounterAtomic") !== "false",
    customerExportSupportAttachmentRetentionJobReady: url.searchParams.get("supportAttachmentRetentionJobReady") !== "false",
    customerExportChannelEventStoreReady: url.searchParams.get("channelEventStoreReady") !== "false",
    customerExportAccountVaultEventId: url.searchParams.get("accountVaultEventId") ?? "vault_event_pass2842",
    customerExportEmailNoticeEventId: url.searchParams.get("emailNoticeEventId") ?? (channel === "email_notice" ? "email_event_pass2842" : null),
    customerExportApiHandoffEventId: url.searchParams.get("apiHandoffEventId") ?? (channel === "api_handoff" ? "api_event_pass2842" : null),
    customerExportSupportAttachmentEventId: url.searchParams.get("supportAttachmentEventId") ?? (channel === "support_attachment" ? "support_attachment_event_pass2842" : null),
    customerExportLedgerPayloadOrSourceRootDrift: bool(url.searchParams.get("ledgerPayloadOrSourceRootDrift")),
    customerExportAckSignedRequired: url.searchParams.get("ackRequired") !== "false",
    customerExportAckLedgerRowId: url.searchParams.get("ackLedgerRowId") ?? "ack_ledger_row_pass2842",
    customerExportAckReceiptId: url.searchParams.get("ackReceiptId") ?? "customer_ack_receipt_pass2842",
    customerExportSignedReceiptId: url.searchParams.get("signedReceiptId") ?? "signed_receipt_pass2842",
    customerExportAckPresentedExportPacketId: url.searchParams.get("ackExportPacketId") ?? "export_packet_pass2842",
    customerExportAckPresentedPayloadHash: url.searchParams.get("ackPayloadHash") ?? "pass2842-demo-payload-hash",
    customerExportAckPresentedSourceReceiptRoot: url.searchParams.get("ackSourceReceiptRoot") ?? "pass2842-demo-source-root",
    customerExportAcknowledgedAt: url.searchParams.get("acknowledgedAt") ?? now.toISOString(),
    customerExportAckExpiresAt: acknowledgementExpiresAt,
    customerExportAckChannel: ackChannel,
    customerExportAckCustomerAccountIdHash: url.searchParams.get("ackCustomerAccountIdHash") ?? "acct_hash_pass2842",
    customerExportAckSignatureHash: url.searchParams.get("ackSignatureHash") ?? "signature_hash_pass2842",
    customerExportAckSignatureVerified: url.searchParams.get("ackSignatureVerified") !== "false",
    customerExportAckSignerNonceHash: url.searchParams.get("ackSignerNonceHash") ?? "nonce_hash_pass2842",
    customerExportAckOperatorCountersignatureId: url.searchParams.get("ackOperatorCountersignatureId") ?? "operator_counter_sig_pass2842",
    customerExportAckNotificationOpenReceiptId: url.searchParams.get("ackNotificationOpenReceiptId") ?? "notification_open_pass2842",
    customerExportAckIpHash: url.searchParams.get("ackIpHash") ?? "ip_hash_pass2842",
    customerExportAckUserAgentHash: url.searchParams.get("ackUserAgentHash") ?? "ua_hash_pass2842",
    customerExportAckChannelMismatch: bool(url.searchParams.get("ackChannelMismatch")),
    customerExportAckPacketHashOrSourceRootMismatch: bool(url.searchParams.get("ackPacketHashOrSourceRootMismatch")),
    customerExportAckPayloadOrSourceRootDrift: bool(url.searchParams.get("ackPayloadOrSourceRootDrift")),
    customerExportAckCustomerDisputed: bool(url.searchParams.get("ackCustomerDisputed")),
    customerExportAckRevoked: bool(url.searchParams.get("ackRevoked")),
    customerExportHoldRequired: url.searchParams.get("holdRequired") === "true" || bool(url.searchParams.get("paymentDisputeActive")) || bool(url.searchParams.get("chargebackActive")) || bool(url.searchParams.get("withdrawalPending")) || bool(url.searchParams.get("policyHold")) || bool(url.searchParams.get("complianceHold")) || bool(url.searchParams.get("customerDisputeOpen")) || bool(url.searchParams.get("refundCreditCollision")),
    customerExportActiveHoldReason: safeCustomerExportHoldReason(url.searchParams.get("activeHoldReason")),
    customerExportDisputeCaseId: url.searchParams.get("disputeCaseId") ?? (bool(url.searchParams.get("paymentDisputeActive")) ? "dispute_case_pass2842" : null),
    customerExportChargebackCaseId: url.searchParams.get("chargebackCaseId") ?? (bool(url.searchParams.get("chargebackActive")) ? "chargeback_case_pass2842" : null),
    customerExportPaymentWithdrawalReceiptId: url.searchParams.get("withdrawalReceiptId") ?? (bool(url.searchParams.get("withdrawalPending")) ? "withdrawal_receipt_pass2842" : null),
    customerExportPolicyHoldReceiptId: url.searchParams.get("policyHoldReceiptId") ?? (bool(url.searchParams.get("policyHold")) ? "policy_hold_pass2842" : null),
    customerExportComplianceReviewReceiptId: url.searchParams.get("complianceReviewReceiptId") ?? (bool(url.searchParams.get("complianceHold")) ? "compliance_review_pass2842" : null),
    customerExportRefundCreditReceiptId: url.searchParams.get("refundCreditReceiptId") ?? (bool(url.searchParams.get("refundCreditCollision")) ? "refund_credit_pass2842" : null),
    customerExportHoldSupportTicketId: url.searchParams.get("holdSupportTicketId") ?? "support_ticket_pass2842",
    customerExportHoldOpenedAt: url.searchParams.get("holdOpenedAt") ?? (url.searchParams.get("holdRequired") === "true" ? now.toISOString() : null),
    customerExportHoldExpiresAt: url.searchParams.get("holdExpiresAt"),
    customerExportHoldReleaseReceiptId: url.searchParams.get("holdReleaseReceiptId") ?? (url.searchParams.get("holdRequired") === "true" && !bool(url.searchParams.get("paymentDisputeActive")) && !bool(url.searchParams.get("chargebackActive")) ? "hold_release_pass2842" : null),
    customerExportHoldOperatorReviewReceiptId: url.searchParams.get("holdOperatorReviewReceiptId") ?? (url.searchParams.get("holdRequired") === "true" && !bool(url.searchParams.get("paymentDisputeActive")) && !bool(url.searchParams.get("chargebackActive")) ? "operator_review_pass2842" : null),
    customerExportHoldPayloadHashBound: url.searchParams.get("holdPayloadHash") ?? "pass2842-demo-payload-hash",
    customerExportHoldSourceReceiptRootBound: url.searchParams.get("holdSourceReceiptRoot") ?? "pass2842-demo-source-root",
    customerExportPaymentDisputeActive: bool(url.searchParams.get("paymentDisputeActive")),
    customerExportChargebackActive: bool(url.searchParams.get("chargebackActive")),
    customerExportPaymentWithdrawalPending: bool(url.searchParams.get("withdrawalPending")),
    customerExportPolicyViolationHold: bool(url.searchParams.get("policyHold")),
    customerExportComplianceHold: bool(url.searchParams.get("complianceHold")),
    customerExportCustomerDisputeOpen: bool(url.searchParams.get("customerDisputeOpen")),
    customerExportRefundCreditCollision: bool(url.searchParams.get("refundCreditCollision")),
    customerExportHoldPayloadOrSourceRootDrift: bool(url.searchParams.get("holdPayloadOrSourceRootDrift")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2842,
      pass2842CustomerExportDisputeChargebackHoldGate: payload.customerExportDisputeChargebackHoldGate,
      pass2842CustomerExportDisputeChargebackHoldAcceptanceGates: PASS2842_CUSTOMER_EXPORT_DISPUTE_CHARGEBACK_HOLD_ACCEPTANCE_GATES,
      pass2841LegacyCompatibility: { pass: 2841, rule: "PASS2841 customer acknowledgement signed receipt must clear before PASS2842 can release dispute/chargeback/payment hold state." },
      pass2841CustomerExportAcknowledgementSignedReceiptGate: payload.customerExportAcknowledgementSignedReceiptGate,
      pass2841CustomerExportAcknowledgementSignedReceiptAcceptanceGates: PASS2841_CUSTOMER_EXPORT_ACK_SIGNED_RECEIPT_ACCEPTANCE_GATES,
      pass2840CustomerExportDeliveryLedgerPersistenceGate: payload.customerExportDeliveryLedgerPersistenceGate,
      pass2840CustomerExportDeliveryLedgerPersistenceAcceptanceGates: PASS2840_CUSTOMER_EXPORT_DELIVERY_LEDGER_PERSISTENCE_ACCEPTANCE_GATES,
      pass2839CustomerExportExpiryRecallGate: payload.customerExportExpiryRecallGate,
      pass2839CustomerExportExpiryRecallAcceptanceGates: PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES,
      pass2838CustomerExportRedactionPacketGate: payload.customerExportRedactionPacketGate,
      pass2838CustomerExportRedactionPacketAcceptanceGates: PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
      customerSafeCopy: "Customer-visible export remains frozen during payment disputes, chargebacks, withdrawal reversals, policy/compliance holds, customer disputes or refund-credit collisions until hold-release and operator-review receipts clear.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
