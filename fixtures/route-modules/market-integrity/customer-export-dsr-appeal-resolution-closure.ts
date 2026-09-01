import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2856_CUSTOMER_EXPORT_DSR_APPEAL_RESOLUTION_CLOSURE_ACCEPTANCE_GATES,
  buildPass2856CustomerExportDsrAppealResolutionClosureGate,
  type Pass2856CustomerExportDsrAppealResolutionChannelReceipt,
  type Pass2856CustomerExportDsrAppealResolutionDecision,
} from "@/lib/market-integrity/top1-customer-export-dsr-appeal-resolution-closure-gate";
import type { Pass2855CustomerExportDsrDeliveryAppealReopenGate } from "@/lib/market-integrity/top1-customer-export-dsr-delivery-appeal-reopen-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function resolutionDecision(value: string | null, appeal: boolean): Pass2856CustomerExportDsrAppealResolutionDecision {
  if (
    value === "accepted_corrected_packet" ||
    value === "partially_accepted_corrected_packet" ||
    value === "rejected_original_packet_valid" ||
    value === "customer_withdrawn" ||
    value === "no_appeal"
  ) {
    return value;
  }
  return appeal ? "accepted_corrected_packet" : "no_appeal";
}

function buildPreviousDsrDeliveryAppealReopenFixture(selectedTier: VelmereTier, generatedAt: string, appeal: boolean): Pass2855CustomerExportDsrDeliveryAppealReopenGate {
  return {
    schemaVersion: "pass2855_customer_export_dsr_delivery_appeal_reopen_gate_v1",
    surface: "API fixture for PASS2856",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2856_fixture",
    sealId: "seal_pass2856_fixture",
    generatedAt,
    dsrDeliveryAppealReopenState: "dsr_delivery_appeal_reopen_ready",
    dsrDeliveryAppealReopenReadinessScore: 99.1,
    dsrDeliveryAppealEnvelope: {
      previousPrivacyIncidentDsrState: "privacy_incident_dsr_escalation_ready",
      previousPrivacyIncidentDsrReadinessScore: 98.8,
      previousCanServeCustomerDsrAuditPacket: true,
      previousCanUnfreezeCustomerExportDelivery: true,
      dsrDeliveryReceiptId: "dsr_delivery_pass2856_fixture",
      customerAcknowledgementReceiptId: "customer_ack_pass2856_fixture",
      appealWindowReceiptId: "appeal_window_pass2856_fixture",
      customerAppealRequested: appeal,
      appealReviewReceiptId: appeal ? "appeal_review_pass2856_fixture" : null,
      appealReopenDecisionReceiptId: appeal ? "appeal_reopen_decision_pass2856_fixture" : null,
      appealReopenFreezeReceiptId: appeal ? "appeal_reopen_freeze_pass2856_fixture" : null,
      reopenedDataSubjectAccessAuditPacketId: appeal ? "reopened_dsar_packet_pass2856_fixture" : null,
      reopenedDataSubjectAccessRedactionManifestHash: appeal ? "reopened_redaction_manifest_hash_pass2856_fixture" : null,
      duplicateDsrDeliveryGuardReceiptId: "duplicate_dsr_delivery_guard_pass2856_fixture",
      channelDsrDeliveryReceipts: [
        { channel: "account_vault", deliveryReceiptId: "account_vault_dsr_delivery_pass2856_fixture", payloadHash: "dsr_payload_hash_pass2856_fixture", redactionManifestHash: "dsr_redaction_manifest_hash_pass2856_fixture", deliveredAt: generatedAt, acknowledged: true, reopenedAfterAppeal: appeal },
        { channel: "email", deliveryReceiptId: "email_dsr_delivery_pass2856_fixture", payloadHash: "dsr_payload_hash_pass2856_fixture", redactionManifestHash: "dsr_redaction_manifest_hash_pass2856_fixture", deliveredAt: generatedAt, acknowledged: true, reopenedAfterAppeal: appeal },
      ],
      customerPrivacyCaseTimelineHash: "customer_privacy_case_timeline_hash_pass2856_fixture",
    },
    dsrDeliveryAppealPolicy: {
      canCloseCustomerDsrDelivery: !appeal,
      canReopenCustomerDsrCase: appeal,
      canUnfreezeCustomerExportAfterAppeal: appeal,
      canClaimProductionDsrAppealWorkflow: false,
      reason: "Fixture PASS2855 DSAR delivery / appeal reopen gate is ready so PASS2856 can verify appeal resolution and final privacy closure.",
    },
    dsrDeliveryAppealRiskSignals: {
      privacyIncidentDsrNotReady: false,
      missingDsrDeliveryReceipt: false,
      missingCustomerAcknowledgementReceipt: false,
      missingAppealWindowReceipt: false,
      missingAppealReviewReceipt: false,
      missingAppealReopenDecision: false,
      missingAppealReopenFreezeReceipt: false,
      missingReopenedPacket: false,
      missingReopenedRedactionManifest: false,
      missingDuplicateDeliveryGuard: false,
      missingChannelDeliveryEvidence: false,
      missingCustomerPrivacyCaseTimelineHash: false,
    },
    customerSafeCopy: "Previous PASS2855 DSAR delivery / appeal reopen fixture is ready for PASS2856 final privacy closure verification.",
    operatorNextActions: [],
  } as Pass2855CustomerExportDsrDeliveryAppealReopenGate;
}

function fixtureCorrectedReceipts(generatedAt: string, corrected: boolean): Pass2856CustomerExportDsrAppealResolutionChannelReceipt[] {
  if (!corrected) return [];
  return ["account_vault", "email"].map((channel) => ({
    channel: channel as Pass2856CustomerExportDsrAppealResolutionChannelReceipt["channel"],
    resolutionDeliveryReceiptId: `${channel}_dsr_resolution_delivery_pass2856_fixture`,
    payloadHash: "corrected_dsr_payload_hash_pass2856_fixture",
    redactionManifestHash: "corrected_dsr_redaction_manifest_hash_pass2856_fixture",
    deliveredAt: generatedAt,
    customerAcknowledged: true,
    correctedPacket: true,
  }));
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-dsr-appeal-resolution-closure");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const appeal = bool(url.searchParams.get("customerAppealRequested") ?? "true");
  const decision = resolutionDecision(url.searchParams.get("appealResolutionDecision"), appeal);
  const corrected = decision === "accepted_corrected_packet" || decision === "partially_accepted_corrected_packet";
  const previousDsrDeliveryAppealReopenGate = buildPreviousDsrDeliveryAppealReopenFixture(selectedTier, generatedAt, appeal);
  const gate = buildPass2856CustomerExportDsrAppealResolutionClosureGate({
    surface: url.searchParams.get("surface") ?? "customer-export-dsr-appeal-resolution-closure-api",
    tier: selectedTier,
    customerExportDsrDeliveryAppealReopenGate: previousDsrDeliveryAppealReopenGate,
    generatedAt,
    appealCaseIntakeReceiptId: appeal ? (url.searchParams.get("appealCaseIntakeReceiptId") ?? "appeal_case_intake_pass2856_fixture") : url.searchParams.get("appealCaseIntakeReceiptId"),
    appealResolutionDecision: decision,
    appealResolutionDecisionReceiptId: appeal ? (url.searchParams.get("appealResolutionDecisionReceiptId") ?? "appeal_resolution_decision_pass2856_fixture") : url.searchParams.get("appealResolutionDecisionReceiptId"),
    correctedDataSubjectAccessAuditPacketId: corrected ? (url.searchParams.get("correctedDataSubjectAccessAuditPacketId") ?? "corrected_dsar_packet_pass2856_fixture") : url.searchParams.get("correctedDataSubjectAccessAuditPacketId"),
    correctedDataSubjectAccessRedactionManifestHash: corrected ? (url.searchParams.get("correctedDataSubjectAccessRedactionManifestHash") ?? "corrected_redaction_manifest_hash_pass2856_fixture") : url.searchParams.get("correctedDataSubjectAccessRedactionManifestHash"),
    correctedPacketSupersedesPacketId: corrected ? (url.searchParams.get("correctedPacketSupersedesPacketId") ?? "reopened_dsar_packet_pass2855_fixture") : url.searchParams.get("correctedPacketSupersedesPacketId"),
    correctedPacketChannelReceipts: fixtureCorrectedReceipts(generatedAt, corrected),
    customerFinalResponseReceiptId: url.searchParams.get("customerFinalResponseReceiptId") ?? "customer_final_response_pass2856_fixture",
    finalPrivacyClosureReceiptId: url.searchParams.get("finalPrivacyClosureReceiptId") ?? "final_privacy_closure_pass2856_fixture",
    noResidualPrivacyObligationReceiptId: url.searchParams.get("noResidualPrivacyObligationReceiptId") ?? "no_residual_privacy_obligation_pass2856_fixture",
    privacyCaseAuditTimelineHash: url.searchParams.get("privacyCaseAuditTimelineHash") ?? "privacy_case_audit_timeline_hash_pass2856_fixture",
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2856,
      gate,
      acceptanceGates: PASS2856_CUSTOMER_EXPORT_DSR_APPEAL_RESOLUTION_CLOSURE_ACCEPTANCE_GATES,
      rule: "DSAR appeal/reopen is not final privacy closure. Closure requires appeal intake/decision where relevant, corrected packet delivery if corrections are accepted, final customer response, no-residual obligation proof and privacy-case timeline hash.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
