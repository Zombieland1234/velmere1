import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-redaction-packet-gate";
import { PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-expiry-recall-gate";
import { PASS2840_CUSTOMER_EXPORT_DELIVERY_LEDGER_PERSISTENCE_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-delivery-ledger-persistence-gate";
import { PASS2841_CUSTOMER_EXPORT_ACK_SIGNED_RECEIPT_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-ack-signed-receipt-gate";
import { PASS2842_CUSTOMER_EXPORT_DISPUTE_CHARGEBACK_HOLD_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-dispute-chargeback-hold-gate";
import { PASS2843_CUSTOMER_EXPORT_OPERATOR_RELEASE_REINSTATEMENT_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-customer-export-operator-release-reinstatement-gate";
import { safeCustomerExportReleaseDecision } from "@/lib/market-integrity/customer-export-route-literals";

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
  const productionGuard = blockProductionFixtureRoute("customer-export-operator-release-reinstatement");
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
  const expiryWindowMinutes = Number(url.searchParams.get("expiryWindowMinutes") ?? 15);
  const issuedAt = url.searchParams.get("issuedAt") ?? now.toISOString();
  const expiresAt = url.searchParams.get("expiresAt") ?? new Date(now.getTime() + expiryWindowMinutes * 60000).toISOString();
  const ackExpiresAt = url.searchParams.get("ackExpiresAt") ?? new Date(now.getTime() + 20 * 60000).toISOString();
  const releaseRequested = url.searchParams.get("releaseRequested") !== "false";

  const payload = buildTop1PdfPayloadDraft({
    locale: "en",
    tier,
    symbol: url.searchParams.get("symbol") ?? "BTC",
    name: url.searchParams.get("name") ?? "Velmere customer export operator release reinstatement sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["production customer reinstatement notice screenshot", "live reissued-link storage proof", "operator console audit screenshot"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_pass2843",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_pass2843",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2843-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2843-demo-source-root",
    incidentCustomerNoticeDrafted: true,
    incidentCustomerNoticeSent: true,
    incidentSupportQueueReady: true,
    remedyPaidOrderAffected: true,
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2843_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2843_demo_receipt",
    remedyRedactedEvidencePacketReady: true,
    remedyManualFinanceReviewComplete: true,
    accountVaultAuditTrailId: "vault_audit_pass2843",
    deliveryLedgerEntryId: "delivery_ledger_pass2843",
    consumedTokenReceiptId: "token_consumed_pass2843",
    remedyDecisionId: "remedy_decision_pass2843",
    reopenReceiptId: "reopen_receipt_pass2843",
    replaySealId: "replay_seal_pass2843",
    replayLockId: "replay_lock_pass2843",
    newReportTokenHash: "new_token_hash_pass2843",
    oldTokenRevocationReceiptId: "old_token_revoked_pass2843",
    deliveryDedupKey: "dedup_pass2843",
    accountVaultTimelineHash: "timeline_pass2843",
    supportTicketId: url.searchParams.get("supportTicketId") ?? "support_ticket_pass2843",
    remedySlaPolicyId: "sla_policy_pass2843",
    supportOwnerPseudonym: "ops-redacted",
    customerNoticeReceiptId: "notice_pass2843",
    supportPacketHash: "support_packet_pass2843",
    financeRemedyReceiptId: "finance_receipt_pass2843",
    deliveryReopenApprovedAt: now.toISOString(),
    supportActualFirstResponseHours: 2,
    supportCurrentAgeHours: 6,
    customerExportRequested: true,
    customerExportPacketId: "export_packet_pass2843",
    customerExportChannel: "account_download",
    customerDownloadId: "download_pass2843",
    customerRedactionManifestHash: "redaction_manifest_pass2843",
    customerMinimizationPolicyId: "min_policy_pass2843",
    customerAckReceiptId: "ack_pass2843",
    customerExportPayloadHashBound: true,
    customerExportSourceReceiptRootBound: true,
    customerExportActiveLinkId: "active_link_pass2843",
    customerExportIssuedAt: issuedAt,
    customerExportExpiresAt: expiresAt,
    customerExportExpiryWindowMinutes: expiryWindowMinutes,
    customerExportRetryBudgetLimit: 3,
    customerExportRetryBudgetUsed: 0,
    customerExportSupportAttachmentRetentionHours: 72,
    customerExportSupportAttachmentCreatedAt: now.toISOString(),
    customerExportAuditTimelineHash: "export_audit_timeline_pass2843",
    customerExportLedgerRowId: "export_ledger_row_pass2843",
    customerExportLedgerPayloadHash: "pass2843-demo-payload-hash",
    customerExportLedgerSourceReceiptRoot: "pass2843-demo-source-root",
    customerExportLedgerSupportSlaTicketId: "support_ticket_pass2843",
    customerExportLedgerStatus: "active",
    customerExportLedgerRequestedChannel: "account_vault",
    customerExportLinkStorageAdapterReady: true,
    customerExportRecallTimelineStoreReady: true,
    customerExportResendIdempotencyStoreReady: true,
    customerExportRetryBudgetCounterAtomic: true,
    customerExportSupportAttachmentRetentionJobReady: true,
    customerExportChannelEventStoreReady: true,
    customerExportAccountVaultEventId: "vault_event_pass2843",
    customerExportAckSignedRequired: true,
    customerExportAckLedgerRowId: "ack_ledger_row_pass2843",
    customerExportAckReceiptId: "customer_ack_receipt_pass2843",
    customerExportSignedReceiptId: "signed_receipt_pass2843",
    customerExportAckPresentedExportPacketId: "export_packet_pass2843",
    customerExportAckPresentedPayloadHash: "pass2843-demo-payload-hash",
    customerExportAckPresentedSourceReceiptRoot: "pass2843-demo-source-root",
    customerExportAcknowledgedAt: now.toISOString(),
    customerExportAckExpiresAt: ackExpiresAt,
    customerExportAckChannel: "customer_portal",
    customerExportAckCustomerAccountIdHash: "acct_hash_pass2843",
    customerExportAckSignatureHash: "signature_hash_pass2843",
    customerExportAckSignatureVerified: true,
    customerExportAckSignerNonceHash: "nonce_hash_pass2843",
    customerExportAckOperatorCountersignatureId: "operator_counter_sig_pass2843",
    customerExportAckNotificationOpenReceiptId: "notification_open_pass2843",
    customerExportAckIpHash: "ip_hash_pass2843",
    customerExportAckUserAgentHash: "ua_hash_pass2843",
    customerExportHoldRequired: true,
    customerExportHoldReleaseReceiptId: url.searchParams.get("holdReleaseReceiptId") ?? "hold_release_pass2843",
    customerExportHoldOperatorReviewReceiptId: url.searchParams.get("holdOperatorReviewReceiptId") ?? "operator_review_pass2843",
    customerExportHoldSupportTicketId: "support_ticket_pass2843",
    customerExportHoldPayloadHashBound: "pass2843-demo-payload-hash",
    customerExportHoldSourceReceiptRootBound: "pass2843-demo-source-root",
    customerExportPaymentDisputeActive: bool(url.searchParams.get("paymentDisputeActive")),
    customerExportChargebackActive: bool(url.searchParams.get("chargebackActive")),
    customerExportPaymentWithdrawalPending: bool(url.searchParams.get("withdrawalPending")),
    customerExportPolicyViolationHold: bool(url.searchParams.get("policyHold")),
    customerExportComplianceHold: bool(url.searchParams.get("complianceHold")),
    customerExportCustomerDisputeOpen: bool(url.searchParams.get("customerDisputeOpen")),
    customerExportRefundCreditCollision: bool(url.searchParams.get("refundCreditCollision")),
    customerExportReleaseRequested: releaseRequested,
    customerExportReleaseDecision: safeCustomerExportReleaseDecision(url.searchParams.get("releaseDecision")),
    customerExportOperatorReleaseReceiptId: url.searchParams.get("operatorReleaseReceiptId") ?? "operator_release_pass2843",
    customerExportSeniorOperatorCountersignatureId: url.searchParams.get("seniorCountersignatureId") ?? "senior_counter_sig_pass2843",
    customerExportFinanceCloseReceiptId: url.searchParams.get("financeCloseReceiptId") ?? "finance_close_pass2843",
    customerExportComplianceCloseReceiptId: url.searchParams.get("complianceCloseReceiptId") ?? "compliance_close_pass2843",
    customerExportSupportResolutionReceiptId: url.searchParams.get("supportResolutionReceiptId") ?? "support_resolution_pass2843",
    customerExportReinstatementNoticeReceiptId: url.searchParams.get("reinstatementNoticeReceiptId") ?? "customer_reinstatement_notice_pass2843",
    customerExportReissuedLinkId: url.searchParams.get("reissuedLinkId") ?? "reissued_export_link_pass2843",
    customerExportChannelReinstatementReceiptId: url.searchParams.get("channelReinstatementReceiptId") ?? "channel_reinstatement_pass2843",
    customerExportReinstatementDedupKey: url.searchParams.get("reinstatementDedupKey") ?? "reinstatement_dedup_pass2843",
    customerExportCoolingWindowEndsAt: url.searchParams.get("coolingWindowEndsAt"),
    customerExportReinstatementPayloadHashBound: "pass2843-demo-payload-hash",
    customerExportReinstatementSourceReceiptRootBound: "pass2843-demo-source-root",
    customerExportPreviousHoldReleaseReceiptId: "hold_release_pass2843",
    customerExportPreviousOperatorReviewReceiptId: "operator_review_pass2843",
    customerExportDuplicateReinstatementAttempt: bool(url.searchParams.get("duplicateReinstatementAttempt")),
    customerExportReinstatementPayloadOrSourceRootDrift: bool(url.searchParams.get("reinstatementPayloadOrSourceRootDrift")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2843,
      pass2843CustomerExportOperatorReleaseReinstatementGate: payload.customerExportOperatorReleaseReinstatementGate,
      pass2843CustomerExportOperatorReleaseReinstatementAcceptanceGates: PASS2843_CUSTOMER_EXPORT_OPERATOR_RELEASE_REINSTATEMENT_ACCEPTANCE_GATES,
      pass2842CustomerExportDisputeChargebackHoldGate: payload.customerExportDisputeChargebackHoldGate,
      pass2842CustomerExportDisputeChargebackHoldAcceptanceGates: PASS2842_CUSTOMER_EXPORT_DISPUTE_CHARGEBACK_HOLD_ACCEPTANCE_GATES,
      pass2841CustomerExportAcknowledgementSignedReceiptGate: payload.customerExportAcknowledgementSignedReceiptGate,
      pass2841CustomerExportAcknowledgementSignedReceiptAcceptanceGates: PASS2841_CUSTOMER_EXPORT_ACK_SIGNED_RECEIPT_ACCEPTANCE_GATES,
      pass2840CustomerExportDeliveryLedgerPersistenceGate: payload.customerExportDeliveryLedgerPersistenceGate,
      pass2840CustomerExportDeliveryLedgerPersistenceAcceptanceGates: PASS2840_CUSTOMER_EXPORT_DELIVERY_LEDGER_PERSISTENCE_ACCEPTANCE_GATES,
      pass2839CustomerExportExpiryRecallGate: payload.customerExportExpiryRecallGate,
      pass2839CustomerExportExpiryRecallAcceptanceGates: PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES,
      pass2838CustomerExportRedactionPacketGate: payload.customerExportRedactionPacketGate,
      pass2838CustomerExportRedactionPacketAcceptanceGates: PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
      customerSafeCopy: "Customer export reinstatement after a hold requires operator release, senior countersignature, finance/compliance/support close, customer notice and fresh channel-bound reissue receipts.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
