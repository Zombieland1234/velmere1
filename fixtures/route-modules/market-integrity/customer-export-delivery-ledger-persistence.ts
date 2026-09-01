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
import { safeCustomerExportLedgerChannel, safeCustomerExportLedgerStatus } from "@/lib/market-integrity/customer-export-route-literals";

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
  const productionGuard = blockProductionFixtureRoute("customer-export-delivery-ledger-persistence");
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
  const channel = safeCustomerExportLedgerChannel(url.searchParams.get("ledgerChannel"));

  const payload = buildTop1PdfPayloadDraft({
    locale: "en",
    tier,
    symbol: url.searchParams.get("symbol") ?? "BTC",
    name: url.searchParams.get("name") ?? "Velmere customer export delivery ledger persistence sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["production DB row proof", "retention job run proof", "transactional email/API send proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2840-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2840-demo-source-root",
    incidentDetected: bool(url.searchParams.get("incidentDetected")),
    incidentPaidEvidenceAffected: bool(url.searchParams.get("paidEvidenceAffected")),
    incidentCustomerNoticeDrafted: true,
    incidentCustomerNoticeSent: true,
    incidentSupportQueueReady: true,
    remedyPaidOrderAffected: true,
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2840_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2840_demo_receipt",
    remedyRedactedEvidencePacketReady: true,
    remedyManualFinanceReviewComplete: true,
    accountVaultAuditTrailId: url.searchParams.get("accountVaultAuditTrailId") ?? "vault_audit_pass2840",
    deliveryLedgerEntryId: url.searchParams.get("deliveryLedgerEntryId") ?? "delivery_ledger_pass2840",
    consumedTokenReceiptId: url.searchParams.get("consumedTokenReceiptId") ?? "token_consumed_pass2840",
    remedyDecisionId: url.searchParams.get("remedyDecisionId") ?? "remedy_decision_pass2840",
    reopenReceiptId: url.searchParams.get("reopenReceiptId") ?? "reopen_receipt_pass2840",
    replaySealId: url.searchParams.get("replaySealId") ?? "replay_seal_pass2840",
    replayLockId: url.searchParams.get("replayLockId") ?? "replay_lock_pass2840",
    newReportTokenHash: url.searchParams.get("newReportTokenHash") ?? "new_token_hash_pass2840",
    oldTokenRevocationReceiptId: url.searchParams.get("oldTokenRevocationReceiptId") ?? "old_token_revoked_pass2840",
    deliveryDedupKey: url.searchParams.get("deliveryDedupKey") ?? "dedup_pass2840",
    accountVaultTimelineHash: url.searchParams.get("accountVaultTimelineHash") ?? "timeline_pass2840",
    supportTicketId: url.searchParams.get("supportTicketId") ?? "support_ticket_pass2840",
    remedySlaPolicyId: url.searchParams.get("remedySlaPolicyId") ?? "sla_policy_pass2840",
    supportOwnerPseudonym: "ops-redacted",
    customerNoticeReceiptId: url.searchParams.get("customerNoticeReceiptId") ?? "notice_pass2840",
    supportPacketHash: url.searchParams.get("supportPacketHash") ?? "support_packet_pass2840",
    financeRemedyReceiptId: url.searchParams.get("financeRemedyReceiptId") ?? "finance_receipt_pass2840",
    deliveryReopenApprovedAt: url.searchParams.get("deliveryReopenApprovedAt") ?? now.toISOString(),
    supportActualFirstResponseHours: Number(url.searchParams.get("firstResponseHours") ?? 2),
    supportCurrentAgeHours: Number(url.searchParams.get("currentAgeHours") ?? 6),
    customerExportRequested: true,
    customerExportPacketId: url.searchParams.get("exportPacketId") ?? "export_packet_pass2840",
    customerExportChannel: "account_download",
    customerDownloadId: url.searchParams.get("customerDownloadId") ?? "download_pass2840",
    customerRedactionManifestHash: url.searchParams.get("redactionManifestHash") ?? "redaction_manifest_pass2840",
    customerMinimizationPolicyId: url.searchParams.get("minimizationPolicyId") ?? "min_policy_pass2840",
    customerAckReceiptId: url.searchParams.get("customerAckReceiptId") ?? "ack_pass2840",
    customerExportPayloadHashBound: true,
    customerExportSourceReceiptRootBound: true,
    customerExportActiveLinkId: url.searchParams.get("activeLinkId") ?? "active_link_pass2840",
    customerExportIssuedAt: issuedAt,
    customerExportExpiresAt: expiresAt,
    customerExportExpiryWindowMinutes: expiryWindowMinutes,
    customerExportRecallRequested: bool(url.searchParams.get("recallRequested")),
    customerExportRecallReceiptId: url.searchParams.get("recallReceiptId") ?? (bool(url.searchParams.get("recallRequested")) ? "recall_receipt_pass2840" : null),
    customerExportResendRequested: bool(url.searchParams.get("resendRequested")),
    customerExportResendIdempotencyKey: url.searchParams.get("resendIdempotencyKey") ?? (bool(url.searchParams.get("resendRequested")) ? "resend_idempotency_pass2840" : null),
    customerExportRetryBudgetLimit: Number(url.searchParams.get("retryBudgetLimit") ?? 3),
    customerExportRetryBudgetUsed: Number(url.searchParams.get("retryBudgetUsed") ?? 0),
    customerExportSupportAttachmentRetentionHours: Number(url.searchParams.get("supportAttachmentRetentionHours") ?? 72),
    customerExportSupportAttachmentCreatedAt: url.searchParams.get("supportAttachmentCreatedAt") ?? now.toISOString(),
    customerExportAuditTimelineHash: url.searchParams.get("auditTimelineHash") ?? "export_audit_timeline_pass2840",
    customerExportLedgerRowId: url.searchParams.get("exportLedgerRowId") ?? "export_ledger_row_pass2840",
    customerExportLedgerPayloadHash: url.searchParams.get("ledgerPayloadHash") ?? "pass2840-demo-payload-hash",
    customerExportLedgerSourceReceiptRoot: url.searchParams.get("ledgerSourceReceiptRoot") ?? "pass2840-demo-source-root",
    customerExportLedgerSupportSlaTicketId: url.searchParams.get("ledgerSupportSlaTicketId") ?? "support_ticket_pass2840",
    customerExportLedgerStatus: safeCustomerExportLedgerStatus(url.searchParams.get("ledgerStatus")),
    customerExportLedgerRequestedChannel: channel,
    customerExportLinkStorageAdapterReady: url.searchParams.get("linkStorageAdapterReady") !== "false",
    customerExportRecallTimelineStoreReady: url.searchParams.get("recallTimelineStoreReady") !== "false",
    customerExportResendIdempotencyStoreReady: url.searchParams.get("resendIdempotencyStoreReady") !== "false",
    customerExportRetryBudgetCounterAtomic: url.searchParams.get("retryBudgetCounterAtomic") !== "false",
    customerExportSupportAttachmentRetentionJobReady: url.searchParams.get("supportAttachmentRetentionJobReady") !== "false",
    customerExportChannelEventStoreReady: url.searchParams.get("channelEventStoreReady") !== "false",
    customerExportAccountVaultEventId: url.searchParams.get("accountVaultEventId") ?? "vault_event_pass2840",
    customerExportEmailNoticeEventId: url.searchParams.get("emailNoticeEventId") ?? (channel === "email_notice" ? "email_event_pass2840" : null),
    customerExportApiHandoffEventId: url.searchParams.get("apiHandoffEventId") ?? (channel === "api_handoff" ? "api_event_pass2840" : null),
    customerExportSupportAttachmentEventId: url.searchParams.get("supportAttachmentEventId") ?? (channel === "support_attachment" ? "support_attachment_event_pass2840" : null),
    customerExportLedgerPayloadOrSourceRootDrift: bool(url.searchParams.get("ledgerPayloadOrSourceRootDrift")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2840,
      pass2840CustomerExportDeliveryLedgerPersistenceGate: payload.customerExportDeliveryLedgerPersistenceGate,
      pass2840CustomerExportDeliveryLedgerPersistenceAcceptanceGates: PASS2840_CUSTOMER_EXPORT_DELIVERY_LEDGER_PERSISTENCE_ACCEPTANCE_GATES,
      pass2839LegacyCompatibility: { pass: 2839, rule: "PASS2839 expiry/recall must clear before PASS2840 persists a customer-visible delivery row." },
      pass2839CustomerExportExpiryRecallGate: payload.customerExportExpiryRecallGate,
      pass2839CustomerExportExpiryRecallAcceptanceGates: PASS2839_CUSTOMER_EXPORT_EXPIRY_RECALL_ACCEPTANCE_GATES,
      pass2838CustomerExportRedactionPacketGate: payload.customerExportRedactionPacketGate,
      pass2838CustomerExportRedactionPacketAcceptanceGates: PASS2838_CUSTOMER_EXPORT_REDACTION_PACKET_ACCEPTANCE_GATES,
      customerSafeCopy: "Customer export delivery now has a durable ledger persistence contract: one packet row, one expiring-link adapter, append-only recall/reissue timeline, atomic retry budget, idempotent resend store and per-channel event IDs.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
