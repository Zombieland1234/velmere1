import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2851_CUSTOMER_EXPORT_ARCHIVE_RETENTION_LEGAL_HOLD_ACCEPTANCE_GATES,
  buildPass2851CustomerExportArchiveRetentionLegalHoldGate,
  type Pass2851CustomerExportRetentionClass,
} from "@/lib/market-integrity/top1-customer-export-archive-retention-legal-hold-gate";
import type { Pass2850CustomerExportFinalArchiveBundleGate } from "@/lib/market-integrity/top1-customer-export-final-archive-bundle-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { CUSTOMER_EXPORT_ARCHIVE_CHANNELS, CUSTOMER_EXPORT_RETENTION_CHANNELS } from "@/lib/market-integrity/customer-export-route-literals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  if (value === "pro" || value === "Pro") return "Pro";
  if (value === "advanced" || value === "Advanced") return "Advanced";
  return "Basic";
}

function retentionClass(value: string | null): Pass2851CustomerExportRetentionClass | null {
  if (value === "standard_report" || value === "advanced_review" || value === "support_attachment" || value === "legal_hold") return value;
  return null;
}

function buildPreviousFinalArchiveFixture(selectedTier: VelmereTier, generatedAt: string): Pass2850CustomerExportFinalArchiveBundleGate {
  return {
    schemaVersion: "pass2850_customer_export_final_archive_bundle_gate_v1",
    surface: "API fixture for PASS2851",
    tier: selectedTier,
    releasePacketId: "release_packet_pass2851_fixture",
    sealId: "seal_pass2851_fixture",
    generatedAt,
    finalArchiveBundleState: "final_archive_bundle_ready",
    finalArchiveBundleReadinessScore: 96.4,
    archiveEnvelope: {
      previousRemediationCloseState: "remediation_ticket_close_ready",
      previousRemediationCloseReadinessScore: 95.8,
      previousCanLiftCustomerExportFreeze: true,
      archiveBundleId: "archive_bundle_pass2851_fixture",
      archiveManifestHash: "archive_manifest_hash_pass2851_fixture",
      immutableStorageReceiptId: "immutable_storage_receipt_pass2851_fixture",
      retentionPolicySnapshotId: "retention_policy_snapshot_pass2851_fixture",
      finalPayloadHash: "payload_hash_pass2851_fixture",
      finalSourceReceiptRoot: "source_receipt_root_pass2851_fixture",
      expectedPayloadHash: "payload_hash_pass2851_fixture",
      expectedSourceReceiptRoot: "source_receipt_root_pass2851_fixture",
      customerAccessIndexId: "customer_access_index_pass2851_fixture",
      operatorArchiveSignoffReceiptId: "operator_archive_signoff_pass2851_fixture",
      archiveClosedAt: generatedAt,
      archiveAuditTimelineHash: "archive_timeline_hash_pass2851_fixture",
      archiveIntegrityDriftDetected: false,
      channelReceipts: CUSTOMER_EXPORT_ARCHIVE_CHANNELS.map((channel) => ({
        channel,
        channelReceiptBundleId: `${channel}_archive_receipt_bundle_pass2851_fixture`,
        lastCommitReceiptId: `${channel}_last_commit_pass2851_fixture`,
        customerVisibleReferenceId: `${channel}_customer_reference_pass2851_fixture`,
        archivedAt: generatedAt,
      })),
    },
    archivePolicy: {
      canCloseCustomerExportArchive: true,
      canServeFinalEvidenceBundle: true,
      canClaimFinalArchiveComplete: true,
      canClaimProductionArchiveWorkflow: false,
      reason: "Fixture PASS2850 final archive is ready so PASS2851 can test retention/legal-hold boundary.",
    },
    archiveRiskSignals: {
      remediationCloseNotReady: false,
      archiveBundleMissing: false,
      archiveManifestMissing: false,
      immutableStorageReceiptMissing: false,
      retentionPolicySnapshotMissing: false,
      payloadOrSourceBindingMissing: false,
      channelReceiptBundleMissing: false,
      customerAccessIndexMissing: false,
      operatorArchiveSignoffMissing: false,
      archiveTimelineMissing: false,
      archiveIntegrityDriftDetected: false,
    },
    customerSafeCopy: "Previous final archive fixture is ready for PASS2851 retention/legal-hold verification.",
    operatorNextActions: [],
  };
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-archive-retention-legal-hold");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const selectedTier = tier(url.searchParams.get("tier"));
  const generatedAt = new Date().toISOString();
  const previousFinalArchiveGate = buildPreviousFinalArchiveFixture(selectedTier, generatedAt);
  const gate = buildPass2851CustomerExportArchiveRetentionLegalHoldGate({
    surface: url.searchParams.get("surface") ?? "customer-export-archive-retention-legal-hold-api",
    tier: selectedTier,
    customerExportFinalArchiveBundleGate: previousFinalArchiveGate,
    generatedAt,
    retentionPolicyId: url.searchParams.get("retentionPolicyId"),
    retentionClass: retentionClass(url.searchParams.get("retentionClass")),
    legalHoldStatusReceiptId: url.searchParams.get("legalHoldStatusReceiptId"),
    legalHoldActive: bool(url.searchParams.get("legalHoldActive")),
    customerDeletionRequestId: url.searchParams.get("customerDeletionRequestId"),
    deletionEligibilityReceiptId: url.searchParams.get("deletionEligibilityReceiptId"),
    retentionTimerReceiptId: url.searchParams.get("retentionTimerReceiptId"),
    scheduledPurgeAt: url.searchParams.get("scheduledPurgeAt"),
    archiveTombstoneId: url.searchParams.get("archiveTombstoneId"),
    archiveAccessRevocationReceiptId: url.searchParams.get("archiveAccessRevocationReceiptId"),
    customerAccessIndexUpdateReceiptId: url.searchParams.get("customerAccessIndexUpdateReceiptId"),
    operatorRetentionSignoffReceiptId: url.searchParams.get("operatorRetentionSignoffReceiptId"),
    retentionDeletionTimelineHash: url.searchParams.get("retentionDeletionTimelineHash"),
    channelPurgeReceipts: CUSTOMER_EXPORT_RETENTION_CHANNELS.map((channel) => ({
      channel,
      purgeReceiptId: url.searchParams.get(`${channel}PurgeReceiptId`),
      archivedBundleReferenceId: url.searchParams.get(`${channel}ArchivedBundleReferenceId`),
      revokedAccessReferenceId: url.searchParams.get(`${channel}RevokedAccessReferenceId`),
      purgedAt: url.searchParams.get(`${channel}PurgedAt`),
    })),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2851,
      gate,
      acceptanceGates: PASS2851_CUSTOMER_EXPORT_ARCHIVE_RETENTION_LEGAL_HOLD_ACCEPTANCE_GATES,
      rule: "Final archive bundles require separate retention, legal-hold, deletion eligibility, purge receipts, customer index update and operator signoff before deletion/purge or retention-complete claims.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
