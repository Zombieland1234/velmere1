import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2854_CUSTOMER_EXPORT_PRIVACY_INCIDENT_DSR_ESCALATION_ACCEPTANCE_GATES,
  buildPass2854CustomerExportPrivacyIncidentDsrEscalationGate,
  type Pass2854CustomerExportResidualIncidentClassification,
} from "@/lib/market-integrity/top1-customer-export-privacy-incident-dsr-escalation-gate";
import type { Pass2853CustomerExportPostPurgePrivacyAttestationGate } from "@/lib/market-integrity/top1-customer-export-post-purge-privacy-attestation-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { CUSTOMER_EXPORT_RESIDUAL_SCAN_CHANNELS } from "@/lib/market-integrity/customer-export-route-literals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function classification(value: string | null): Pass2854CustomerExportResidualIncidentClassification {
  if (
    value === "suspected_residual_trace" ||
    value === "confirmed_residual_data" ||
    value === "customer_request_only" ||
    value === "legal_hold_review"
  ) {
    return value;
  }
  return "none_observed";
}

function buildPreviousPrivacyFixture(selectedTier: VelmereTier, generatedAt: string): Pass2853CustomerExportPostPurgePrivacyAttestationGate {
  return {
    schemaVersion: "pass2853_customer_export_post_purge_privacy_attestation_gate_v1",
    surface: "API fixture for PASS2854",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2854_fixture",
    sealId: "seal_pass2854_fixture",
    generatedAt,
    postPurgePrivacyAttestationState: "post_purge_privacy_attestation_ready",
    postPurgePrivacyAttestationReadinessScore: 98.6,
    privacyEnvelope: {
      previousPurgeState: "retention_purge_execution_tombstone_ready",
      previousPurgeReadinessScore: 98.1,
      previousCanMarkArchiveAsTombstoned: true,
      previousCanServeCustomerArchiveAfterPurge: false,
      purgeCompletedAt: generatedAt,
      verifiedArchiveTombstoneId: "verified_archive_tombstone_pass2854_fixture",
      tombstoneManifestHash: "tombstone_manifest_hash_pass2854_fixture",
      residualScannerRunId: "residual_scanner_run_pass2854_fixture",
      residualScanManifestHash: "residual_scan_manifest_hash_pass2854_fixture",
      searchIndexPurgeReceiptId: "search_index_purge_pass2854_fixture",
      cdnCachePurgeReceiptId: "cdn_cache_purge_pass2854_fixture",
      residualDataDetected: false,
      residualDataRemediationTicketId: null,
      privacyAttestationReceiptId: "privacy_attestation_pass2854_fixture",
      privacyOfficerSignoffReceiptId: "privacy_officer_signoff_pass2854_fixture",
      customerFinalPrivacyNoticeReceiptId: "customer_final_privacy_notice_pass2854_fixture",
      postPurgePrivacyReconciliationHash: "post_purge_privacy_reconciliation_hash_pass2854_fixture",
      channelResidualScanReceipts: CUSTOMER_EXPORT_RESIDUAL_SCAN_CHANNELS.map((channel) => ({
        channel,
        residualScanReceiptId: `${channel}_residual_scan_pass2854_fixture`,
        purgeVerificationReceiptId: `${channel}_purge_verification_pass2854_fixture`,
        residualItemCount: 0,
        scannedAt: generatedAt,
      })),
    },
    privacyPolicy: {
      canMarkCustomerExportPrivacyClosed: true,
      canServeCustomerDataAfterPurge: false,
      canClaimProductionPrivacyPurgeWorkflow: false,
      reason: "Fixture PASS2853 post-purge privacy gate is ready so PASS2854 can verify privacy incident / DSAR escalation.",
    },
    privacyRiskSignals: {
      purgeTombstoneNotReady: false,
      missingResidualScannerRun: false,
      missingResidualScanManifest: false,
      missingChannelResidualScan: false,
      missingSearchIndexPurgeReceipt: false,
      missingCdnCachePurgeReceipt: false,
      residualDataDetected: false,
      missingResidualRemediationTicket: false,
      missingPrivacyAttestationReceipt: false,
      missingPrivacyOfficerSignoff: false,
      missingCustomerFinalPrivacyNotice: false,
      missingPostPurgePrivacyReconciliation: false,
    },
    customerSafeCopy: "Previous PASS2853 privacy attestation fixture is ready for PASS2854 incident/DSAR verification.",
    operatorNextActions: [],
  } as Pass2853CustomerExportPostPurgePrivacyAttestationGate;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-privacy-incident-dsr-escalation");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const previousPrivacyGate = buildPreviousPrivacyFixture(selectedTier, generatedAt);
  const gate = buildPass2854CustomerExportPrivacyIncidentDsrEscalationGate({
    surface: url.searchParams.get("surface") ?? "customer-export-privacy-incident-dsr-escalation-api",
    tier: selectedTier,
    customerExportPostPurgePrivacyAttestationGate: previousPrivacyGate,
    generatedAt,
    residualPrivacyIncidentDetected: bool(url.searchParams.get("residualPrivacyIncidentDetected")),
    incidentClassification: classification(url.searchParams.get("incidentClassification")),
    incidentReviewReceiptId: url.searchParams.get("incidentReviewReceiptId"),
    exportDeliveryFreezeReceiptId: url.searchParams.get("exportDeliveryFreezeReceiptId"),
    customerImpactScopeId: url.searchParams.get("customerImpactScopeId"),
    privacySecurityEscalationReceiptId: url.searchParams.get("privacySecurityEscalationReceiptId"),
    legalRegulatorReviewBoundaryReceiptId: url.searchParams.get("legalRegulatorReviewBoundaryReceiptId"),
    customerNoticeEscalationPathReceiptId: url.searchParams.get("customerNoticeEscalationPathReceiptId"),
    dataSubjectAccessAuditPacketId: url.searchParams.get("dataSubjectAccessAuditPacketId"),
    dataSubjectAccessRedactionManifestHash: url.searchParams.get("dataSubjectAccessRedactionManifestHash"),
    dataSubjectAccessRawSecretLeakDetected: bool(url.searchParams.get("dataSubjectAccessRawSecretLeakDetected")),
    operatorPrivacyIncidentSignoffReceiptId: url.searchParams.get("operatorPrivacyIncidentSignoffReceiptId"),
    incidentDsrTimelineHash: url.searchParams.get("incidentDsrTimelineHash"),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2854,
      gate,
      acceptanceGates: PASS2854_CUSTOMER_EXPORT_PRIVACY_INCIDENT_DSR_ESCALATION_ACCEPTANCE_GATES,
      rule: "Post-purge privacy close requires incident/no-incident review, export freeze proof, minimized DSAR packet, redaction manifest, legal boundary and operator signoff before customer-facing privacy closure claims.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
