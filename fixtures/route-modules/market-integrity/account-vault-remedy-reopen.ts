import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import { parseRiskScore, RISK_SCORE_UNAVAILABLE_CODE } from "@/lib/market-integrity/risk-score-availability";
import { buildTop1PdfPayloadDraft } from "@/lib/market-integrity/top1-pdf-report-payload";
import { PASS2835_ACCOUNT_VAULT_REMEDY_REOPEN_AUDIT_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-account-vault-remedy-reopen-audit-gate";
import { PASS2836_REMEDY_REOPEN_REPLAY_LOCK_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-remedy-reopen-replay-lock-gate";
import { PASS2837_SUPPORT_SLA_REMEDY_PROOF_ACCEPTANCE_GATES } from "@/lib/market-integrity/top1-support-sla-remedy-proof-gate";
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
  const productionGuard = blockProductionFixtureRoute("account-vault-remedy-reopen");
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
    name: url.searchParams.get("name") ?? "Velmere account-vault remedy reopen sample",
    family: "native_crypto",
    riskScore,
    sourceFamilyCount: Number(url.searchParams.get("sourceFamilies") ?? 3),
    missingEvidence: ["build/typecheck proof", "customer delivery proof", "account vault reopen proof"],
    accountId: "acct_redacted_demo",
    serverReceiptId: url.searchParams.get("serverReceiptId") ?? "srv_receipt_demo",
    reportToken: url.searchParams.get("reportToken") ?? "report_token_demo",
    payloadHash: url.searchParams.get("payloadHash") ?? "pass2835-demo-payload-hash",
    sourceReceiptRoot: url.searchParams.get("sourceReceiptRoot") ?? "pass2835-demo-source-root",
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
    remedyRefundRequested: bool(url.searchParams.get("refundRequested")),
    remedyRefundApproved: bool(url.searchParams.get("refundApproved")),
    remedyCreditIssued: bool(url.searchParams.get("creditIssued")),
    remedySupportTicketId: url.searchParams.get("supportTicketId") ?? "ticket_pass2835_demo",
    remedyPaymentReceiptId: url.searchParams.get("paymentReceiptId") ?? "pi_pass2835_demo_receipt",
    remedyRedactedEvidencePacketReady: bool(url.searchParams.get("evidencePacketReady")),
    remedyManualFinanceReviewComplete: bool(url.searchParams.get("financeReviewComplete")),
    accountVaultAuditTrailId: url.searchParams.get("accountVaultAuditTrailId"),
    deliveryLedgerEntryId: url.searchParams.get("deliveryLedgerEntryId"),
    consumedTokenReceiptId: url.searchParams.get("consumedTokenReceiptId"),
    remedyDecisionId: url.searchParams.get("remedyDecisionId"),
    reopenReceiptId: url.searchParams.get("reopenReceiptId"),
    replaySealId: url.searchParams.get("replaySealId"),
    accountVaultAllIdsRedacted: url.searchParams.get("allIdsRedacted") !== "false",
    accountVaultPayloadHashBound: url.searchParams.get("payloadHashBound") !== "false",
    accountVaultSourceReceiptRootBound: url.searchParams.get("sourceReceiptRootBound") !== "false",
    accountVaultRefundCreditDecisionBound: url.searchParams.get("refundCreditDecisionBound") !== "false",
    accountVaultStaleRemedyDecision: bool(url.searchParams.get("staleRemedyDecision")),
    accountVaultReusedConsumedToken: bool(url.searchParams.get("reusedConsumedToken")),
    accountVaultTimelineGap: bool(url.searchParams.get("timelineGap")),
    accountVaultPayloadOrSourceRootDrift: bool(url.searchParams.get("payloadOrSourceRootDrift")),
    accountVaultRevokedAfterReopen: bool(url.searchParams.get("revokedAfterReopen")),
    accountVaultWatchWindowHours: Number(url.searchParams.get("watchWindowHours") ?? 24),
    replayLockId: url.searchParams.get("replayLockId"),
    newReportTokenHash: url.searchParams.get("newReportTokenHash"),
    oldTokenRevocationReceiptId: url.searchParams.get("oldTokenRevocationReceiptId"),
    deliveryDedupKey: url.searchParams.get("deliveryDedupKey"),
    accountVaultTimelineHash: url.searchParams.get("accountVaultTimelineHash"),
    replayLockAllIdsRedacted: url.searchParams.get("replayLockAllIdsRedacted") !== "false",
    replayLockPayloadHashBound: url.searchParams.get("replayLockPayloadHashBound") !== "false",
    replayLockSourceReceiptRootBound: url.searchParams.get("replayLockSourceReceiptRootBound") !== "false",
    replayLockEntitlementPolicyBound: url.searchParams.get("replayLockEntitlementPolicyBound") !== "false",
    replayLockAccountVaultReopenReceiptBound: url.searchParams.get("replayLockAccountVaultReopenReceiptBound") !== "false",
    duplicateDeliveryAttempt: bool(url.searchParams.get("duplicateDeliveryAttempt")),
    oldTokenPresented: bool(url.searchParams.get("oldTokenPresented")),
    reopenReceiptReplayMismatch: bool(url.searchParams.get("reopenReceiptReplayMismatch")),
    tokenRotationMissing: bool(url.searchParams.get("tokenRotationMissing")),
    replayLockWatchWindowExpired: bool(url.searchParams.get("replayLockWatchWindowExpired")),
    replayLockPayloadOrSourceRootDrift: bool(url.searchParams.get("replayLockPayloadOrSourceRootDrift")),
    replayLockRevoked: bool(url.searchParams.get("replayLockRevoked")),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2836,
      pass2835LegacyCompatibility: { pass: 2835, rule: "PASS2835 account-vault remedy reopen audit remains present while PASS2836 adds replay-lock and duplicate-delivery firewall." },
      pass2835AccountVaultRemedyReopenAuditGate: payload.accountVaultRemedyReopenAuditGate,
      pass2836RemedyReopenReplayLockGate: payload.remedyReopenReplayLockGate,
      pass2837SupportSlaRemedyProofGate: payload.supportSlaRemedyProofGate,
      pass2836RemedyReopenReplayLockAcceptanceGates: PASS2836_REMEDY_REOPEN_REPLAY_LOCK_ACCEPTANCE_GATES,
      pass2837SupportSlaRemedyProofAcceptanceGates: PASS2837_SUPPORT_SLA_REMEDY_PROOF_ACCEPTANCE_GATES,
      pass2835AccountVaultRemedyReopenAuditAcceptanceGates: PASS2835_ACCOUNT_VAULT_REMEDY_REOPEN_AUDIT_ACCEPTANCE_GATES,
      pass2835AccountVaultRemedyReopenRule: "Remedy resolution cannot reopen account-vault delivery until vault audit trail, remedy decision, reopen receipt, replay seal and new-token continuity are payload/source-root bound.",
      pass2836RemedyReopenReplayLockRule: "Reopened paid delivery needs a replay-lock envelope: new token hash, old-token revocation receipt, delivery dedup key and account-vault timeline hash; duplicate/old-token replay blocks paid evidence.",
      linkedCustomerRemedyGate: payload.customerRemedyRefundCreditGate,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
