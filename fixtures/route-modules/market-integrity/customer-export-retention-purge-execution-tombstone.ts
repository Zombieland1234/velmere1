import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2852_CUSTOMER_EXPORT_RETENTION_PURGE_EXECUTION_TOMBSTONE_ACCEPTANCE_GATES,
  buildPass2852CustomerExportRetentionPurgeExecutionTombstoneGate,
} from "@/lib/market-integrity/top1-customer-export-retention-purge-execution-tombstone-gate";
import type { Pass2851CustomerExportArchiveRetentionLegalHoldGate } from "@/lib/market-integrity/top1-customer-export-archive-retention-legal-hold-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { CUSTOMER_EXPORT_RETENTION_CHANNELS, CUSTOMER_EXPORT_PURGE_CHANNELS } from "@/lib/market-integrity/customer-export-route-literals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  return value === "Pro" || value === "pro" ? "Pro" : value === "Advanced" || value === "advanced" ? "Advanced" : "Basic";
}

function buildPreviousRetentionFixture(selectedTier: VelmereTier, generatedAt: string): Pass2851CustomerExportArchiveRetentionLegalHoldGate {
  return {
    schemaVersion: "pass2851_customer_export_archive_retention_legal_hold_gate_v1",
    surface: "API fixture for PASS2852",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2852_fixture",
    sealId: "seal_pass2852_fixture",
    generatedAt,
    archiveRetentionLegalHoldState: "archive_retention_legal_hold_ready",
    archiveRetentionLegalHoldReadinessScore: 97.2,
    retentionEnvelope: {
      previousFinalArchiveState: "final_archive_bundle_ready",
      previousFinalArchiveReadinessScore: 96.4,
      previousCanCloseCustomerExportArchive: true,
      archiveBundleId: "archive_bundle_pass2852_fixture",
      archiveManifestHash: "archive_manifest_hash_pass2852_fixture",
      retentionPolicyId: "retention_policy_pass2852_fixture",
      retentionClass: "standard_report",
      legalHoldStatusReceiptId: "legal_hold_clear_pass2852_fixture",
      legalHoldActive: false,
      customerDeletionRequestId: "customer_deletion_request_pass2852_fixture",
      deletionEligibilityReceiptId: "deletion_eligibility_pass2852_fixture",
      retentionTimerReceiptId: "retention_timer_pass2852_fixture",
      scheduledPurgeAt: generatedAt,
      archiveTombstoneId: "archive_tombstone_pass2852_fixture",
      archiveAccessRevocationReceiptId: "archive_access_revocation_pass2852_fixture",
      customerAccessIndexUpdateReceiptId: "customer_access_index_update_pass2852_fixture",
      operatorRetentionSignoffReceiptId: "operator_retention_signoff_pass2852_fixture",
      retentionDeletionTimelineHash: "retention_deletion_timeline_hash_pass2852_fixture",
      channelPurgeReceipts: CUSTOMER_EXPORT_RETENTION_CHANNELS.map((channel) => ({
        channel,
        purgeReceiptId: `${channel}_purge_receipt_pass2852_fixture`,
        archivedBundleReferenceId: `${channel}_archive_bundle_reference_pass2852_fixture`,
        revokedAccessReferenceId: `${channel}_revoked_access_pass2852_fixture`,
        purgedAt: generatedAt,
      })),
    },
    retentionPolicy: {
      canRetainFinalArchive: true,
      canDeleteOrPurgeCustomerExportArchive: true,
      canServeCustomerArchiveAfterRetentionDecision: true,
      canClaimProductionRetentionWorkflow: false,
      reason: "Fixture PASS2851 retention/legal-hold gate is ready so PASS2852 can test purge execution and tombstone verification.",
    },
    retentionRiskSignals: {
      finalArchiveNotReady: false,
      missingRetentionPolicy: false,
      missingRetentionClass: false,
      missingLegalHoldStatus: false,
      legalHoldActive: false,
      missingDeletionEligibility: false,
      missingRetentionTimer: false,
      missingArchiveTombstone: false,
      missingAccessRevocation: false,
      missingChannelPurgeReceipts: false,
      missingCustomerAccessIndexUpdate: false,
      missingOperatorRetentionSignoff: false,
      missingRetentionDeletionTimeline: false,
    },
    customerSafeCopy: "Previous retention/legal-hold fixture is ready for PASS2852 purge execution verification.",
    operatorNextActions: [],
  };
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-retention-purge-execution-tombstone");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const previousRetentionGate = buildPreviousRetentionFixture(selectedTier, generatedAt);
  const gate = buildPass2852CustomerExportRetentionPurgeExecutionTombstoneGate({
    surface: url.searchParams.get("surface") ?? "customer-export-retention-purge-execution-tombstone-api",
    tier: selectedTier,
    customerExportArchiveRetentionLegalHoldGate: previousRetentionGate,
    generatedAt,
    purgeWorkerRunId: url.searchParams.get("purgeWorkerRunId"),
    legalHoldReleaseReceiptId: url.searchParams.get("legalHoldReleaseReceiptId"),
    storageLifecycleExecutionReceiptId: url.searchParams.get("storageLifecycleExecutionReceiptId"),
    tombstoneManifestHash: url.searchParams.get("tombstoneManifestHash"),
    verifiedArchiveTombstoneId: url.searchParams.get("verifiedArchiveTombstoneId"),
    customerIndexPurgeMarkerId: url.searchParams.get("customerIndexPurgeMarkerId"),
    immutablePurgeAuditReceiptId: url.searchParams.get("immutablePurgeAuditReceiptId"),
    postPurgeReconciliationReceiptId: url.searchParams.get("postPurgeReconciliationReceiptId"),
    operatorPurgeSignoffReceiptId: url.searchParams.get("operatorPurgeSignoffReceiptId"),
    purgeCompletedAt: url.searchParams.get("purgeCompletedAt"),
    postPurgeDriftDetected: bool(url.searchParams.get("postPurgeDriftDetected")),
    channelPurgeExecutionReceipts: CUSTOMER_EXPORT_PURGE_CHANNELS.map((channel) => ({
      channel,
      purgeJobId: url.searchParams.get(`${channel}PurgeJobId`),
      storageDeleteReceiptId: url.searchParams.get(`${channel}StorageDeleteReceiptId`),
      tombstoneVerifyReceiptId: url.searchParams.get(`${channel}TombstoneVerifyReceiptId`),
      customerAccessRevokedAt: url.searchParams.get(`${channel}CustomerAccessRevokedAt`),
    })),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2852,
      gate,
      acceptanceGates: PASS2852_CUSTOMER_EXPORT_RETENTION_PURGE_EXECUTION_TOMBSTONE_ACCEPTANCE_GATES,
      rule: "Retention/legal-hold approval requires separate purge worker execution, storage lifecycle receipt, per-channel delete receipts, tombstone verification, customer index purge marker, reconciliation and operator signoff before purge-complete claims.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
