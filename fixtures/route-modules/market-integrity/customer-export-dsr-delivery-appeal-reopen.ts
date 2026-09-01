import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2855_CUSTOMER_EXPORT_DSR_DELIVERY_APPEAL_REOPEN_ACCEPTANCE_GATES,
  buildPass2855CustomerExportDsrDeliveryAppealReopenGate,
  type Pass2855CustomerExportDsrChannelDeliveryReceipt,
} from "@/lib/market-integrity/top1-customer-export-dsr-delivery-appeal-reopen-gate";
import type { Pass2854CustomerExportPrivacyIncidentDsrEscalationGate } from "@/lib/market-integrity/top1-customer-export-privacy-incident-dsr-escalation-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function buildPreviousPrivacyIncidentDsrFixture(selectedTier: VelmereTier, generatedAt: string): Pass2854CustomerExportPrivacyIncidentDsrEscalationGate {
  return {
    schemaVersion: "pass2854_customer_export_privacy_incident_dsr_escalation_gate_v1",
    surface: "API fixture for PASS2855",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2855_fixture",
    sealId: "seal_pass2855_fixture",
    generatedAt,
    privacyIncidentDsrEscalationState: "privacy_incident_dsr_escalation_ready",
    privacyIncidentDsrEscalationReadinessScore: 98.8,
    incidentDsrEnvelope: {
      previousPostPurgePrivacyState: "post_purge_privacy_attestation_ready",
      previousPostPurgePrivacyReadinessScore: 98.6,
      previousCanMarkCustomerExportPrivacyClosed: true,
      residualDataDetectedInPreviousGate: false,
      residualPrivacyIncidentDetected: false,
      incidentClassification: "none_observed",
      incidentReviewReceiptId: "incident_review_pass2855_fixture",
      exportDeliveryFreezeReceiptId: "export_freeze_pass2855_fixture",
      customerImpactScopeId: null,
      privacySecurityEscalationReceiptId: null,
      legalRegulatorReviewBoundaryReceiptId: "legal_boundary_pass2855_fixture",
      customerNoticeEscalationPathReceiptId: null,
      dataSubjectAccessAuditPacketId: "dsar_audit_packet_pass2855_fixture",
      dataSubjectAccessRedactionManifestHash: "dsar_redaction_manifest_hash_pass2855_fixture",
      dataSubjectAccessRawSecretLeakDetected: false,
      operatorPrivacyIncidentSignoffReceiptId: "operator_privacy_signoff_pass2855_fixture",
      incidentDsrTimelineHash: "incident_dsr_timeline_hash_pass2855_fixture",
    },
    incidentDsrPolicy: {
      canClosePrivacyIncidentReview: true,
      canServeCustomerDsrAuditPacket: true,
      canUnfreezeCustomerExportDelivery: true,
      canClaimProductionIncidentDsrWorkflow: false,
      reason: "Fixture PASS2854 privacy incident / DSAR gate is ready so PASS2855 can verify DSAR delivery, appeal and reopen boundary.",
    },
    incidentDsrRiskSignals: {
      postPurgePrivacyNotReady: false,
      missingIncidentReviewReceipt: false,
      missingExportDeliveryFreezeReceipt: false,
      missingIncidentClassification: false,
      missingCustomerImpactScope: false,
      missingPrivacySecurityEscalationReceipt: false,
      missingLegalRegulatorReviewBoundary: false,
      missingCustomerNoticeEscalationPath: false,
      missingDsrAuditPacket: false,
      missingDsrRedactionManifest: false,
      dsarRawSecretLeakDetected: false,
      missingOperatorPrivacyIncidentSignoff: false,
      missingIncidentDsrTimelineHash: false,
    },
    customerSafeCopy: "Previous PASS2854 incident / DSAR fixture is ready for PASS2855 DSAR delivery appeal/reopen verification.",
    operatorNextActions: [],
  } as Pass2854CustomerExportPrivacyIncidentDsrEscalationGate;
}

function fixtureChannelReceipts(generatedAt: string, appeal: boolean): Pass2855CustomerExportDsrChannelDeliveryReceipt[] {
  return ["account_vault", "email"].map((channel) => ({
    channel: channel as Pass2855CustomerExportDsrChannelDeliveryReceipt["channel"],
    deliveryReceiptId: `${channel}_dsr_delivery_pass2855_fixture`,
    payloadHash: "dsr_payload_hash_pass2855_fixture",
    redactionManifestHash: "dsr_redaction_manifest_hash_pass2855_fixture",
    deliveredAt: generatedAt,
    acknowledged: true,
    reopenedAfterAppeal: appeal,
  }));
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-dsr-delivery-appeal-reopen");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const appeal = bool(url.searchParams.get("customerAppealRequested"));
  const previousPrivacyIncidentDsrGate = buildPreviousPrivacyIncidentDsrFixture(selectedTier, generatedAt);
  const gate = buildPass2855CustomerExportDsrDeliveryAppealReopenGate({
    surface: url.searchParams.get("surface") ?? "customer-export-dsr-delivery-appeal-reopen-api",
    tier: selectedTier,
    customerExportPrivacyIncidentDsrEscalationGate: previousPrivacyIncidentDsrGate,
    generatedAt,
    dsrDeliveryReceiptId: url.searchParams.get("dsrDeliveryReceiptId") ?? "dsr_delivery_pass2855_fixture",
    customerAcknowledgementReceiptId: url.searchParams.get("customerAcknowledgementReceiptId") ?? "customer_ack_pass2855_fixture",
    appealWindowReceiptId: url.searchParams.get("appealWindowReceiptId") ?? "appeal_window_pass2855_fixture",
    customerAppealRequested: appeal,
    appealReviewReceiptId: appeal ? (url.searchParams.get("appealReviewReceiptId") ?? "appeal_review_pass2855_fixture") : url.searchParams.get("appealReviewReceiptId"),
    appealReopenDecisionReceiptId: appeal ? (url.searchParams.get("appealReopenDecisionReceiptId") ?? "appeal_reopen_decision_pass2855_fixture") : url.searchParams.get("appealReopenDecisionReceiptId"),
    appealReopenFreezeReceiptId: appeal ? (url.searchParams.get("appealReopenFreezeReceiptId") ?? "appeal_reopen_freeze_pass2855_fixture") : url.searchParams.get("appealReopenFreezeReceiptId"),
    reopenedDataSubjectAccessAuditPacketId: appeal ? (url.searchParams.get("reopenedDataSubjectAccessAuditPacketId") ?? "reopened_dsar_packet_pass2855_fixture") : url.searchParams.get("reopenedDataSubjectAccessAuditPacketId"),
    reopenedDataSubjectAccessRedactionManifestHash: appeal ? (url.searchParams.get("reopenedDataSubjectAccessRedactionManifestHash") ?? "reopened_dsar_redaction_manifest_hash_pass2855_fixture") : url.searchParams.get("reopenedDataSubjectAccessRedactionManifestHash"),
    duplicateDsrDeliveryGuardReceiptId: url.searchParams.get("duplicateDsrDeliveryGuardReceiptId") ?? "duplicate_dsr_delivery_guard_pass2855_fixture",
    channelDsrDeliveryReceipts: fixtureChannelReceipts(generatedAt, appeal),
    customerPrivacyCaseTimelineHash: url.searchParams.get("customerPrivacyCaseTimelineHash") ?? "customer_privacy_case_timeline_hash_pass2855_fixture",
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2855,
      gate,
      acceptanceGates: PASS2855_CUSTOMER_EXPORT_DSR_DELIVERY_APPEAL_REOPEN_ACCEPTANCE_GATES,
      rule: "DSAR/export-of-export escalation requires packet-bound delivery receipt, customer acknowledgement, appeal window, duplicate-delivery guard, channel delivery evidence and appeal/reopen freeze before customer-facing closure claims.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
