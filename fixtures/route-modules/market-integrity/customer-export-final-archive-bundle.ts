import { NextResponse } from "next/server";
import { blockProductionFixtureRoute } from "@/lib/security/production-fixture-route-guard";
import {
  PASS2850_CUSTOMER_EXPORT_FINAL_ARCHIVE_BUNDLE_ACCEPTANCE_GATES,
  buildPass2850CustomerExportFinalArchiveBundleGate,
} from "@/lib/market-integrity/top1-customer-export-final-archive-bundle-gate";
import type { Pass2849CustomerExportRemediationTicketCloseGate } from "@/lib/market-integrity/top1-customer-export-remediation-ticket-close-gate";
import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
import { CUSTOMER_EXPORT_ARCHIVE_CHANNELS } from "@/lib/market-integrity/customer-export-route-literals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bool(value: string | null) {
  return value === "true" || value === "1" || value === "yes";
}

function tier(value: string | null): VelmereTier {
  if (value === "Basic" || value === "Pro" || value === "Advanced") return value;
  return "Advanced";
}

export async function GET(request: Request) {
  const productionGuard = blockProductionFixtureRoute("customer-export-final-archive-bundle");
  if (productionGuard) return productionGuard;
  const url = new URL(request.url);
  const generatedAt = new Date().toISOString();
  const payloadHash = url.searchParams.get("payloadHash") ?? "payload_hash_pass2850";
  const sourceReceiptRoot = url.searchParams.get("sourceReceiptRoot") ?? "source_root_pass2850";
  const selectedTier = tier(url.searchParams.get("tier"));
  const surface = url.searchParams.get("surface") ?? "Customer Export";
  const previousRemediationGate = {
    schemaVersion: "pass2849_customer_export_remediation_ticket_close_gate_v1",
    surface,
    tier: selectedTier,
    releasePacketId: url.searchParams.get("releasePacketId") ?? "release_packet_pass2850",
    sealId: url.searchParams.get("sealId") ?? "seal_pass2850",
    generatedAt,
    remediationTicketCloseState: url.searchParams.get("previousRemediationState") ?? "remediation_ticket_close_ready",
    remediationTicketCloseReadinessScore: Number(url.searchParams.get("previousRemediationReadinessScore") ?? "100"),
    remediationEnvelope: {
      previousReconciliationState: "reconciliation_drift_monitor_ready",
      previousReconciliationReadinessScore: 100,
      previousDriftDetected: false,
      previousDriftRemediationTicketId: null,
      remediationTicketId: url.searchParams.get("remediationTicketId") ?? "remediation_ticket_pass2850",
      remediationRootCause: "no_drift_observed",
      operatorRemediationReceiptId: "operator_remediation_receipt_pass2850",
      replayAndResealReceiptId: "replay_reseal_receipt_pass2850",
      correctedPayloadHash: payloadHash,
      correctedSourceReceiptRoot: sourceReceiptRoot,
      expectedPayloadHash: payloadHash,
      expectedSourceReceiptRoot: sourceReceiptRoot,
      customerImpactAssessmentId: "customer_impact_pass2850",
      freezeLiftDecisionReceiptId: "freeze_lift_pass2850",
      customerRemediationNoticeReceiptId: "customer_notice_pass2850",
      remediationClosedAt: generatedAt,
      remediationAuditTimelineHash: "remediation_timeline_pass2850",
      noResidualDriftReceiptId: "no_residual_drift_pass2850",
    },
    remediationPolicy: {
      canCloseRemediationTicket: true,
      canLiftCustomerExportFreeze: true,
      canResumeCustomerVisibleChannels: true,
      canClaimProductionRemediationWorkflow: false,
      reason: "Fixture previous gate for PASS2850 archive boundary; production proof still requires live DB/storage/worker/operator UI evidence.",
    },
    remediationRiskSignals: {
      reconciliationNotReady: false,
      driftNeedsTicket: false,
      missingRootCause: false,
      missingOperatorRemediationReceipt: false,
      missingReplayAndResealReceipt: false,
      correctedPayloadOrSourceBindingMissing: false,
      missingCustomerImpactAssessment: false,
      missingFreezeLiftDecision: false,
      missingCustomerNotice: false,
      missingRemediationTimeline: false,
      residualDriftDetected: false,
    },
    customerSafeCopy: "Previous remediation close is fixture-bound for PASS2850 archive verification.",
    operatorNextActions: [],
  } as Pass2849CustomerExportRemediationTicketCloseGate;

  const gate = buildPass2850CustomerExportFinalArchiveBundleGate({
    surface,
    tier: selectedTier,
    customerExportRemediationTicketCloseGate: previousRemediationGate,
    generatedAt,
    archiveBundleId: url.searchParams.get("archiveBundleId"),
    archiveManifestHash: url.searchParams.get("archiveManifestHash"),
    immutableStorageReceiptId: url.searchParams.get("immutableStorageReceiptId"),
    retentionPolicySnapshotId: url.searchParams.get("retentionPolicySnapshotId"),
    finalPayloadHash: url.searchParams.get("finalPayloadHash") ?? payloadHash,
    finalSourceReceiptRoot: url.searchParams.get("finalSourceReceiptRoot") ?? sourceReceiptRoot,
    customerAccessIndexId: url.searchParams.get("customerAccessIndexId"),
    operatorArchiveSignoffReceiptId: url.searchParams.get("operatorArchiveSignoffReceiptId"),
    archiveClosedAt: url.searchParams.get("archiveClosedAt"),
    archiveAuditTimelineHash: url.searchParams.get("archiveAuditTimelineHash"),
    archiveIntegrityDriftDetected: bool(url.searchParams.get("archiveIntegrityDriftDetected")),
    channelReceipts: CUSTOMER_EXPORT_ARCHIVE_CHANNELS.map((channel) => ({
      channel,
      channelReceiptBundleId: url.searchParams.get(`${channel}ArchiveReceiptBundleId`),
      lastCommitReceiptId: url.searchParams.get(`${channel}LastCommitReceiptId`),
      customerVisibleReferenceId: url.searchParams.get(`${channel}CustomerVisibleReferenceId`),
      archivedAt: url.searchParams.get(`${channel}ArchivedAt`),
    })),
  });

  return NextResponse.json(
    {
      ok: true,
      pass: 2850,
      gate,
      acceptanceGates: PASS2850_CUSTOMER_EXPORT_FINAL_ARCHIVE_BUNDLE_ACCEPTANCE_GATES,
      rule: "Final customer export close requires immutable archive bundle, manifest hash, retention-policy snapshot, per-channel receipt bundles, customer access index, operator archive signoff and corrected payload/source-root binding.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
