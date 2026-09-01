import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2853_CUSTOMER_EXPORT_POST_PURGE_PRIVACY_ATTESTATION_ACCEPTANCE_GATES,
  buildPass2853CustomerExportPostPurgePrivacyAttestationGate,
} from "@/lib/market-integrity/top1-customer-export-post-purge-privacy-attestation-gate";
import type { Pass2852CustomerExportRetentionPurgeExecutionTombstoneGate } from "@/lib/market-integrity/top1-customer-export-retention-purge-execution-tombstone-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { CUSTOMER_EXPORT_PURGE_CHANNELS, CUSTOMER_EXPORT_RESIDUAL_SCAN_CHANNELS } from "@/lib/market-integrity/customer-export-route-literals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function numberValue(value: string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function buildPreviousPurgeFixture(selectedTier: VelmereTier, generatedAt: string): Pass2852CustomerExportRetentionPurgeExecutionTombstoneGate {
  return {
    schemaVersion: "pass2852_customer_export_retention_purge_execution_tombstone_gate_v1",
    surface: "API fixture for PASS2853",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2853_fixture",
    sealId: "seal_pass2853_fixture",
    generatedAt,
    purgeExecutionTombstoneState: "retention_purge_execution_tombstone_ready",
    purgeExecutionTombstoneReadinessScore: 98.1,
    purgeEnvelope: {
      previousRetentionState: "archive_retention_legal_hold_ready",
      previousRetentionReadinessScore: 97.2,
      previousCanDeleteOrPurgeCustomerExportArchive: true,
      archiveBundleId: "archive_bundle_pass2853_fixture",
      archiveTombstoneId: "archive_tombstone_pass2853_fixture",
      retentionPolicyId: "retention_policy_pass2853_fixture",
      scheduledPurgeAt: generatedAt,
      purgeWorkerRunId: "purge_worker_run_pass2853_fixture",
      legalHoldReleaseReceiptId: "legal_hold_release_pass2853_fixture",
      storageLifecycleExecutionReceiptId: "storage_lifecycle_execution_pass2853_fixture",
      tombstoneManifestHash: "tombstone_manifest_hash_pass2853_fixture",
      verifiedArchiveTombstoneId: "verified_archive_tombstone_pass2853_fixture",
      customerIndexPurgeMarkerId: "customer_index_purge_marker_pass2853_fixture",
      immutablePurgeAuditReceiptId: "immutable_purge_audit_pass2853_fixture",
      postPurgeReconciliationReceiptId: "post_purge_reconciliation_pass2853_fixture",
      operatorPurgeSignoffReceiptId: "operator_purge_signoff_pass2853_fixture",
      purgeCompletedAt: generatedAt,
      postPurgeDriftDetected: false,
      channelPurgeExecutionReceipts: CUSTOMER_EXPORT_PURGE_CHANNELS.map((channel) => ({
        channel,
        purgeJobId: `${channel}_purge_job_pass2853_fixture`,
        storageDeleteReceiptId: `${channel}_storage_delete_pass2853_fixture`,
        tombstoneVerifyReceiptId: `${channel}_tombstone_verify_pass2853_fixture`,
        customerAccessRevokedAt: generatedAt,
      })),
    },
    purgePolicy: {
      canExecuteCustomerExportArchivePurge: true,
      canMarkArchiveAsTombstoned: true,
      canServeCustomerArchiveAfterPurge: false,
      canClaimProductionPurgeWorkflow: false,
      reason: "Fixture PASS2852 purge/tombstone gate is ready so PASS2853 can verify post-purge privacy attestation.",
    },
    purgeRiskSignals: {
      retentionLegalHoldNotReady: false,
      missingPurgeWorkerRun: false,
      missingLegalHoldReleaseReceipt: false,
      missingStorageLifecycleExecution: false,
      missingChannelPurgeExecution: false,
      missingTombstoneManifest: false,
      missingTombstoneVerification: false,
      missingCustomerIndexPurgeMarker: false,
      missingImmutableAuditReceipt: false,
      missingPostPurgeReconciliation: false,
      postPurgeDriftDetected: false,
      missingOperatorPurgeSignoff: false,
      missingPurgeCompletionTimestamp: false,
    },
    customerSafeCopy: "Previous purge/tombstone fixture is ready for PASS2853 privacy attestation verification.",
    operatorNextActions: [],
  } as Pass2852CustomerExportRetentionPurgeExecutionTombstoneGate;
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-post-purge-privacy-attestation");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const previousPurgeGate = buildPreviousPurgeFixture(selectedTier, generatedAt);
  const gate = buildPass2853CustomerExportPostPurgePrivacyAttestationGate({
    surface: url.searchParams.get("surface") ?? "customer-export-post-purge-privacy-attestation-api",
    tier: selectedTier,
    customerExportRetentionPurgeExecutionTombstoneGate: previousPurgeGate,
    generatedAt,
    residualScannerRunId: url.searchParams.get("residualScannerRunId"),
    residualScanManifestHash: url.searchParams.get("residualScanManifestHash"),
    searchIndexPurgeReceiptId: url.searchParams.get("searchIndexPurgeReceiptId"),
    cdnCachePurgeReceiptId: url.searchParams.get("cdnCachePurgeReceiptId"),
    residualDataDetected: bool(url.searchParams.get("residualDataDetected")),
    residualDataRemediationTicketId: url.searchParams.get("residualDataRemediationTicketId"),
    privacyAttestationReceiptId: url.searchParams.get("privacyAttestationReceiptId"),
    privacyOfficerSignoffReceiptId: url.searchParams.get("privacyOfficerSignoffReceiptId"),
    customerFinalPrivacyNoticeReceiptId: url.searchParams.get("customerFinalPrivacyNoticeReceiptId"),
    postPurgePrivacyReconciliationHash: url.searchParams.get("postPurgePrivacyReconciliationHash"),
    channelResidualScanReceipts: CUSTOMER_EXPORT_RESIDUAL_SCAN_CHANNELS.map((channel) => ({
      channel,
      residualScanReceiptId: url.searchParams.get(`${channel}ResidualScanReceiptId`),
      purgeVerificationReceiptId: url.searchParams.get(`${channel}PurgeVerificationReceiptId`),
      residualItemCount: numberValue(url.searchParams.get(`${channel}ResidualItemCount`)),
      scannedAt: url.searchParams.get(`${channel}ScannedAt`),
    })),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2853,
      gate,
      acceptanceGates: PASS2853_CUSTOMER_EXPORT_POST_PURGE_PRIVACY_ATTESTATION_ACCEPTANCE_GATES,
      rule: "Purge/tombstone completion requires residual-data scanner evidence, index/cache purge receipts, privacy attestation, final customer notice and post-purge privacy reconciliation before privacy-close claims.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
