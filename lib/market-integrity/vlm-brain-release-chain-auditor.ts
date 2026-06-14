import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCustomerExportFirewall } from "./vlm-brain-customer-export-firewall";
import type { VlmBrainDurableSnapshotPlan } from "./vlm-brain-durable-snapshot-plan";
import type { VlmBrainLiveAdapterFreshnessMesh } from "./vlm-brain-live-adapter-freshness";
import type { VlmBrainReleaseReviewPacket } from "./vlm-brain-release-review-packet";
import type { VlmBrainSourceCoverageMatrix } from "./vlm-brain-source-coverage-matrix";
import type { VlmBrainSourcePolicyGate } from "./vlm-brain-source-policy-gate";
import type { VlmBrainSourceTruthSpine } from "./vlm-brain-source-truth-spine";

export type VlmBrainReleaseChainAuditLaneId =
  | "source_coverage"
  | "release_packet"
  | "truth_spine"
  | "adapter_freshness"
  | "source_policy"
  | "durable_snapshot"
  | "customer_firewall"
  | "pdf_route";

export type VlmBrainReleaseChainAuditState = "blocked" | "review" | "preview_only" | "ready";

export type VlmBrainReleaseChainAuditLane = {
  id: VlmBrainReleaseChainAuditLaneId;
  label: string;
  state: VlmBrainReleaseChainAuditState;
  score: number;
  upstreamRef: string;
  blockerCount: number;
  reviewCount: number;
  publicCopyGate: "blocked" | "review_locked" | "operator_only" | "context_after_review";
  operatorAction: string;
  customerBoundary: string;
};

export type VlmBrainReleaseChainAudit = {
  schemaVersion: "vlm-brain-release-chain-auditor-v1-pass220";
  auditMode: "operator_release_chain_audit_preview";
  auditId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  chainDecision: "blocked" | "review_required" | "internal_preview_locked";
  releaseReadinessScore: number;
  publicExportReady: false;
  pdfDownloadReady: false;
  rawPayloadAllowed: false;
  serverAdapterRequiredCount: number;
  hardBlockCount: number;
  reviewCount: number;
  readyPreviewCount: number;
  chainLanes: VlmBrainReleaseChainAuditLane[];
  operatorSummary: string;
  customerBoundary: string;
  nextMilestone: string;
};

const PASS220_RELEASE_CHAIN_AUDITOR_SCHEMA = "vlm-brain-release-chain-auditor-v1-pass220" as const;

function compact(value: unknown, fallback = "release chain audit review required", limit = 340) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-RELEASE-CHAIN-AUDIT", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lane(input: {
  id: VlmBrainReleaseChainAuditLaneId;
  label: string;
  state: VlmBrainReleaseChainAuditState;
  score: number;
  upstreamRef: string;
  blockerCount?: number;
  reviewCount?: number;
  publicCopyGate: VlmBrainReleaseChainAuditLane["publicCopyGate"];
  operatorAction: string;
  customerBoundary: string;
}): VlmBrainReleaseChainAuditLane {
  return {
    id: input.id,
    label: compact(input.label, "release chain lane", 120),
    state: input.state,
    score: clampPercent(input.score),
    upstreamRef: compact(input.upstreamRef, "upstream preview", 180),
    blockerCount: Math.max(0, Math.round(input.blockerCount ?? (input.state === "blocked" ? 1 : 0))),
    reviewCount: Math.max(0, Math.round(input.reviewCount ?? (input.state === "review" ? 1 : 0))),
    publicCopyGate: input.publicCopyGate,
    operatorAction: compact(input.operatorAction, "keep this lane in operator review before customer export"),
    customerBoundary: compact(input.customerBoundary, "not a certificate, trading signal or final verdict"),
  };
}

function stateFromRelease(decision: VlmBrainReleaseReviewPacket["decision"]): VlmBrainReleaseChainAuditState {
  if (decision === "hard_block") return "blocked";
  if (decision === "operator_review") return "review";
  return "preview_only";
}

function stateFromTruth(decision: VlmBrainSourceTruthSpine["decision"]): VlmBrainReleaseChainAuditState {
  if (decision === "hard_block") return "blocked";
  if (decision === "refresh_required" || decision === "operator_review") return "review";
  return "preview_only";
}

function stateFromFreshness(decision: VlmBrainLiveAdapterFreshnessMesh["decision"]): VlmBrainReleaseChainAuditState {
  if (decision === "hard_block") return "blocked";
  if (decision === "refresh_required" || decision === "operator_review") return "review";
  return "preview_only";
}

function stateFromPolicy(decision: VlmBrainSourcePolicyGate["policyDecision"]): VlmBrainReleaseChainAuditState {
  if (decision === "blocked") return "blocked";
  if (decision === "lead_review" || decision === "operator_review") return "review";
  return "preview_only";
}

function publicGateFromState(state: VlmBrainReleaseChainAuditState): VlmBrainReleaseChainAuditLane["publicCopyGate"] {
  if (state === "blocked") return "blocked";
  if (state === "review") return "review_locked";
  if (state === "preview_only") return "operator_only";
  return "context_after_review";
}

function decisionFor(lanes: VlmBrainReleaseChainAuditLane[]): VlmBrainReleaseChainAudit["chainDecision"] {
  if (lanes.some((item) => item.state === "blocked" || item.publicCopyGate === "blocked")) return "blocked";
  if (lanes.some((item) => item.state === "review" || item.publicCopyGate === "review_locked")) return "review_required";
  return "internal_preview_locked";
}

export function buildVlmBrainReleaseChainAudit(
  firewall: VlmBrainCustomerExportFirewall,
  matrix: VlmBrainSourceCoverageMatrix,
  releasePacket: VlmBrainReleaseReviewPacket,
  truthSpine: VlmBrainSourceTruthSpine,
  freshnessMesh: VlmBrainLiveAdapterFreshnessMesh,
  policyGate: VlmBrainSourcePolicyGate,
  durableSnapshotPlan: VlmBrainDurableSnapshotPlan,
  result: TokenRiskResult,
): VlmBrainReleaseChainAudit {
  const createdAt = result.generatedAt ?? durableSnapshotPlan.createdAt ?? new Date().toISOString();
  const symbol = compact(result.token.symbol || releasePacket.token.symbol || "TOKEN", "TOKEN", 32).toUpperCase();
  const durableBlocked = durableSnapshotPlan.durableWriteDecision === "blocked";
  const durableServerRequired = durableSnapshotPlan.durableWriteDecision === "server_adapter_required";
  const firewallBlocked = firewall.releaseState === "customer_export_blocked" || firewall.pdfRouteGate !== "operator_preview_only";
  const lanes = [
    lane({
      id: "source_coverage",
      label: "Source coverage matrix",
      state: matrix.blockedLaneCount > 0 ? "blocked" : matrix.missingLaneCount > 0 || matrix.secondSourceRequired ? "review" : "preview_only",
      score: matrix.overallCoverageScore,
      upstreamRef: matrix.matrixId,
      blockerCount: matrix.blockedLaneCount,
      reviewCount: matrix.missingLaneCount + (matrix.secondSourceRequired ? 1 : 0),
      publicCopyGate: matrix.blockedLaneCount > 0 ? "blocked" : matrix.secondSourceRequired ? "review_locked" : "operator_only",
      operatorAction: "Attach second-source evidence for missing/review lanes before any customer-facing summary.",
      customerBoundary: matrix.customerBoundary,
    }),
    lane({
      id: "release_packet",
      label: "Release review packet",
      state: stateFromRelease(releasePacket.decision),
      score: releasePacket.releaseScore,
      upstreamRef: releasePacket.packetId,
      blockerCount: releasePacket.blockerCount,
      reviewCount: releasePacket.reviewCount,
      publicCopyGate: releasePacket.decision === "hard_block" ? "blocked" : releasePacket.decision === "operator_review" ? "review_locked" : "operator_only",
      operatorAction: "Keep release checklist and blocker count attached to the case before report preview.",
      customerBoundary: releasePacket.customerBoundary,
    }),
    lane({
      id: "truth_spine",
      label: "Source truth spine",
      state: stateFromTruth(truthSpine.decision),
      score: truthSpine.truthScore,
      upstreamRef: truthSpine.spineId,
      blockerCount: truthSpine.blockedLaneCount + truthSpine.missingLaneCount,
      reviewCount: truthSpine.staleLaneCount,
      publicCopyGate: truthSpine.customerExport === "blocked" ? "blocked" : truthSpine.customerExport === "review_locked" ? "review_locked" : "operator_only",
      operatorAction: "Refresh stale adapters, keep missing lanes visible and never treat missing data as neutral.",
      customerBoundary: truthSpine.customerBoundary,
    }),
    lane({
      id: "adapter_freshness",
      label: "Live adapter freshness",
      state: stateFromFreshness(freshnessMesh.decision),
      score: freshnessMesh.freshnessScore,
      upstreamRef: freshnessMesh.meshId,
      blockerCount: freshnessMesh.hardStopCount,
      reviewCount: freshnessMesh.refreshRequiredCount,
      publicCopyGate: freshnessMesh.customerExportGate === "blocked" ? "blocked" : freshnessMesh.customerExportGate === "review_locked" ? "review_locked" : "operator_only",
      operatorAction: "Refresh expired/stale sources and store adapter ids before report export.",
      customerBoundary: freshnessMesh.customerBoundary,
    }),
    lane({
      id: "source_policy",
      label: "Source policy gate",
      state: stateFromPolicy(policyGate.policyDecision),
      score: policyGate.trustedPreviewLaneCount * 14,
      upstreamRef: policyGate.policyId,
      blockerCount: policyGate.blockedLaneCount,
      reviewCount: policyGate.secondSourceRequiredCount,
      publicCopyGate: policyGate.customerCopy === "blocked" ? "blocked" : policyGate.customerCopy === "review_locked" ? "review_locked" : "operator_only",
      operatorAction: "Apply allowlist, reviewer and forbidden-claim policy before customer copy.",
      customerBoundary: policyGate.customerBoundary,
    }),
    lane({
      id: "durable_snapshot",
      label: "Durable snapshot plan",
      state: durableBlocked ? "blocked" : durableServerRequired ? "review" : "preview_only",
      score: durableBlocked ? 24 : durableServerRequired ? 46 : 72,
      upstreamRef: durableSnapshotPlan.planId,
      blockerCount: durableSnapshotPlan.blockedWriteCount,
      reviewCount: durableServerRequired ? durableSnapshotPlan.writes.length : 0,
      publicCopyGate: durableBlocked ? "blocked" : "review_locked",
      operatorAction: "Connect server-only source/case/redaction/export stores before customer download.",
      customerBoundary: durableSnapshotPlan.customerBoundary,
    }),
    lane({
      id: "customer_firewall",
      label: "Customer export firewall",
      state: firewallBlocked ? "blocked" : firewall.releaseState === "operator_review_required" ? "review" : "preview_only",
      score: Math.min(firewall.evidenceCoverageScore, firewall.redactionScore),
      upstreamRef: firewall.firewallId,
      blockerCount: firewall.debtMatrix.filter((item) => item.severity === "blocker").length,
      reviewCount: firewall.debtMatrix.filter((item) => item.severity === "review").length,
      publicCopyGate: firewall.customerVisibility === "hidden_until_review" ? "blocked" : firewall.customerVisibility === "redacted_summary_after_review" ? "review_locked" : "operator_only",
      operatorAction: "Keep PDF/customer export disabled until source, redaction and durable-store debts are closed.",
      customerBoundary: firewall.customerCopyBoundary,
    }),
    lane({
      id: "pdf_route",
      label: "PDF route gate",
      state: firewall.pdfRouteGate === "operator_preview_only" && !durableBlocked ? "review" : "blocked",
      score: firewall.pdfRouteGate === "operator_preview_only" ? 48 : 18,
      upstreamRef: `${firewall.firewallId}::${durableSnapshotPlan.planId}`,
      blockerCount: firewall.pdfRouteGate === "operator_preview_only" ? durableSnapshotPlan.blockedWriteCount : 1,
      reviewCount: durableServerRequired ? 1 : 0,
      publicCopyGate: "blocked",
      operatorAction: "Binary PDF download remains blocked until durable storage and redaction envelope pass production QA.",
      customerBoundary: "PDF route preview is internal only; it is not a certificate, not a safety guarantee and not an investment instruction.",
    }),
  ];
  const chainDecision = decisionFor(lanes);
  const hardBlockCount = lanes.reduce((sum, item) => sum + item.blockerCount, 0);
  const reviewCount = lanes.reduce((sum, item) => sum + item.reviewCount, 0);
  const serverAdapterRequiredCount = durableSnapshotPlan.writes.filter((item) => item.state === "requires_server_adapter").length + (freshnessMesh.sourceLedgerWrite === "preview_only_not_persisted" ? 1 : 0);
  const releaseReadinessScore = clampPercent(
    Math.min(
      releasePacket.releaseScore,
      matrix.overallCoverageScore,
      truthSpine.truthScore,
      freshnessMesh.freshnessScore,
      Math.min(firewall.evidenceCoverageScore, firewall.redactionScore),
      lanes.reduce((sum, item) => sum + item.score, 0) / Math.max(lanes.length, 1),
    ),
  );
  return {
    schemaVersion: PASS220_RELEASE_CHAIN_AUDITOR_SCHEMA,
    auditMode: "operator_release_chain_audit_preview",
    auditId: stableId(`VLM-RELEASE-CHAIN-AUDIT-${symbol}-${durableSnapshotPlan.planId}-${createdAt}`),
    createdAt,
    token: {
      symbol,
      name: compact(result.token.name || durableSnapshotPlan.token.name || symbol, symbol),
    },
    chainDecision,
    releaseReadinessScore,
    publicExportReady: false,
    pdfDownloadReady: false,
    rawPayloadAllowed: false,
    serverAdapterRequiredCount,
    hardBlockCount,
    reviewCount,
    readyPreviewCount: lanes.filter((item) => item.state === "preview_only" || item.state === "ready").length,
    chainLanes: lanes,
    operatorSummary:
      chainDecision === "blocked"
        ? "Release chain is blocked. Keep customer export and PDF download disabled until source, policy, freshness and durable snapshot debts are closed."
        : chainDecision === "review_required"
          ? "Release chain needs operator/lead review. Only redacted internal preview is allowed until all review lanes are resolved."
          : "Release chain is internal-preview locked. Customer export still requires production durable storage, final redaction QA and browser validation.",
    customerBoundary:
      "This release chain audit is an internal review layer. It never certifies token safety, never gives buy/sell guidance and never turns missing data into a positive signal.",
    nextMilestone:
      "Connect server-only durable source snapshots, persist case timeline ids, then run real browser QA before enabling any customer PDF route.",
  };
}

export const PASS220_VLM_BRAIN_RELEASE_CHAIN_AUDITOR_CONTRACT = true;
