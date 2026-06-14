import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCapsuleHandoff } from "./vlm-brain-capsule-handoff";
import type { VlmBrainCaseReviewTimeline } from "./vlm-brain-case-review-timeline";
import type { VlmBrainOperatorActionQueue } from "./vlm-brain-operator-action-queue";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainCustomerExportReleaseState =
  | "customer_export_blocked"
  | "operator_review_required"
  | "internal_preview_ready";

export type VlmBrainCustomerExportDebtSeverity = "blocker" | "review" | "context";

export type VlmBrainCustomerExportDebtLane =
  | "source"
  | "freshness"
  | "redaction"
  | "timeline"
  | "evidence"
  | "copy"
  | "durability";

export type VlmBrainCustomerExportDebt = {
  id: string;
  lane: VlmBrainCustomerExportDebtLane;
  severity: VlmBrainCustomerExportDebtSeverity;
  label: string;
  detail: string;
  nextAction: string;
  customerImpact: "blocks_download" | "requires_operator_review" | "documents_context";
};

export type VlmBrainCustomerExportFirewall = {
  schemaVersion: "vlm-brain-customer-export-firewall-v1-pass213";
  firewallMode: "customer_export_preview_gate";
  firewallId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  handoffId: string;
  queueId: string;
  timelineId: string;
  releaseState: VlmBrainCustomerExportReleaseState;
  customerVisibility: "hidden_until_review" | "redacted_summary_after_review" | "internal_preview_only";
  pdfRouteGate: "disabled_until_durable_case" | "disabled_until_redaction" | "operator_preview_only";
  evidenceCoverageScore: number;
  redactionScore: number;
  sourceDebtCount: number;
  debtMatrix: VlmBrainCustomerExportDebt[];
  releaseChecklist: string[];
  customerCopyBoundary: string;
  operatorBoundary: string;
};

function compact(value: unknown, fallback = "operator review required", limit = 340) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-FIREWALL", 220)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addDebt(
  debts: VlmBrainCustomerExportDebt[],
  debt: Omit<VlmBrainCustomerExportDebt, "id"> & { idSeed: string },
) {
  const id = stableId(debt.idSeed);
  if (debts.some((item) => item.id === id)) return;
  debts.push({
    id,
    lane: debt.lane,
    severity: debt.severity,
    label: compact(debt.label, "source debt", 150),
    detail: compact(debt.detail, "manual review required", 360),
    nextAction: compact(debt.nextAction, "verify source before export", 260),
    customerImpact: debt.customerImpact,
  });
}

function releaseStateFromDebt(debts: VlmBrainCustomerExportDebt[], timeline: VlmBrainCaseReviewTimeline): VlmBrainCustomerExportReleaseState {
  if (debts.some((debt) => debt.severity === "blocker" || debt.customerImpact === "blocks_download")) return "customer_export_blocked";
  if (timeline.status !== "ready_for_internal_case" || debts.some((debt) => debt.severity === "review")) return "operator_review_required";
  return "internal_preview_ready";
}

function visibilityForRelease(releaseState: VlmBrainCustomerExportReleaseState) {
  if (releaseState === "customer_export_blocked") return "hidden_until_review" as const;
  if (releaseState === "operator_review_required") return "redacted_summary_after_review" as const;
  return "internal_preview_only" as const;
}

function pdfGateForRelease(releaseState: VlmBrainCustomerExportReleaseState) {
  if (releaseState === "customer_export_blocked") return "disabled_until_durable_case" as const;
  if (releaseState === "operator_review_required") return "disabled_until_redaction" as const;
  return "operator_preview_only" as const;
}

function buildDebtMatrix(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  timeline: VlmBrainCaseReviewTimeline,
  result: TokenRiskResult,
) {
  const debts: VlmBrainCustomerExportDebt[] = [];

  if (capsule.exportReadiness !== "ready") {
    addDebt(debts, {
      idSeed: `${capsule.capsuleId}-capsule-${capsule.exportReadiness}`,
      lane: "redaction",
      severity: capsule.exportReadiness === "blocked" ? "blocker" : "review",
      label: "Capsule is not customer-export ready",
      detail: `Capsule readiness is ${capsule.exportReadiness}; keep the tile inside operator preview until the redaction and source checks are complete.`,
      nextAction: "Review public brief, operator memo and redaction rules before enabling any customer summary.",
      customerImpact: capsule.exportReadiness === "blocked" ? "blocks_download" : "requires_operator_review",
    });
  }

  if (handoff.freshness.state !== "fresh") {
    addDebt(debts, {
      idSeed: `${handoff.handoffId}-freshness-${handoff.freshness.state}`,
      lane: "freshness",
      severity: handoff.freshness.state === "stale" || handoff.freshness.state === "unknown" ? "blocker" : "review",
      label: "Source freshness needs review",
      detail: handoff.freshness.label,
      nextAction: "Refresh live data or attach a second independent source before a public-facing brief.",
      customerImpact: handoff.freshness.state === "aging" ? "requires_operator_review" : "blocks_download",
    });
  }

  for (const blocker of handoff.blockedBy.slice(0, 5)) {
    addDebt(debts, {
      idSeed: `${handoff.handoffId}-blocker-${blocker}`,
      lane: blocker.toLowerCase().includes("source") ? "source" : "evidence",
      severity: "blocker",
      label: "Handoff blocker remains open",
      detail: blocker,
      nextAction: "Resolve this blocker or keep the report route disabled for the customer surface.",
      customerImpact: "blocks_download",
    });
  }

  for (const action of queue.actions.slice(0, 6)) {
    if (action.exportImpact === "documents_context") continue;
    addDebt(debts, {
      idSeed: `${queue.queueId}-action-${action.id}`,
      lane: action.lane === "redaction" ? "redaction" : action.lane === "report_preview" ? "copy" : "evidence",
      severity: action.exportImpact === "blocks_export" || action.priority === "P1" ? "blocker" : "review",
      label: action.label,
      detail: action.detail,
      nextAction: action.dueWindow === "before_public_brief" ? "Complete before public brief." : "Complete before PDF preview.",
      customerImpact: action.exportImpact === "blocks_export" ? "blocks_download" : "requires_operator_review",
    });
  }

  if (timeline.ownerGate.durableWrite !== "not_connected") {
    addDebt(debts, {
      idSeed: `${timeline.timelineId}-durable-write`,
      lane: "durability",
      severity: "blocker",
      label: "Durable case timeline is required",
      detail: "The current timeline is a client preview. Customer export must wait for durable storage and audit linkage.",
      nextAction: "Persist capsule, handoff, queue and timeline ids in a durable case store before enabling export.",
      customerImpact: "blocks_download",
    });
  }

  const limitations = result.metaModel?.limitations ?? [];
  for (const limitation of limitations.slice(0, 4)) {
    addDebt(debts, {
      idSeed: `${capsule.capsuleId}-limitation-${limitation}`,
      lane: "evidence",
      severity: "review",
      label: "Meta-model limitation",
      detail: limitation,
      nextAction: "Reflect this limitation in operator notes and keep customer language cautious.",
      customerImpact: "requires_operator_review",
    });
  }

  if ((result.signals ?? []).some((signal) => signal.id === "insufficient_data")) {
    addDebt(debts, {
      idSeed: `${capsule.capsuleId}-insufficient-data-signal`,
      lane: "source",
      severity: "blocker",
      label: "Insufficient-data signal is active",
      detail: "Missing evidence cannot be treated as a clean read. It must stay as a review flag.",
      nextAction: "Attach source confidence, missing fields and second-source notes before export.",
      customerImpact: "blocks_download",
    });
  }

  addDebt(debts, {
    idSeed: `${capsule.capsuleId}-copy-boundary`,
    lane: "copy",
    severity: "context",
    label: "Customer copy boundary",
    detail: "Customer-facing text must stay in anomaly, review, source confidence and missing-data language.",
    nextAction: "Do not convert the tile into a final verdict or promotional investment wording.",
    customerImpact: "documents_context",
  });

  return debts.slice(0, 10);
}

function evidenceCoverage(result: TokenRiskResult, debtMatrix: VlmBrainCustomerExportDebt[]) {
  const signalCount = result.signals?.length ?? 0;
  const limitationCount = result.metaModel?.limitations?.length ?? 0;
  const blockerPenalty = debtMatrix.filter((debt) => debt.severity === "blocker").length * 16;
  const reviewPenalty = debtMatrix.filter((debt) => debt.severity === "review").length * 8;
  const signalBonus = Math.min(24, signalCount * 4);
  const limitationPenalty = Math.min(24, limitationCount * 6);
  return clampPercent(58 + signalBonus - blockerPenalty - reviewPenalty - limitationPenalty);
}

function redactionCoverage(capsule: VlmBrainReportCapsuleEnvelope, debtMatrix: VlmBrainCustomerExportDebt[]) {
  const hasBoundary = capsule.dataBoundary.length > 20 && capsule.redactionRules.length >= 2;
  const blockerPenalty = debtMatrix.filter((debt) => debt.lane === "redaction" && debt.severity === "blocker").length * 25;
  const reviewPenalty = debtMatrix.filter((debt) => debt.lane === "redaction" && debt.severity === "review").length * 12;
  return clampPercent((hasBoundary ? 86 : 60) - blockerPenalty - reviewPenalty);
}

export function buildVlmBrainCustomerExportFirewall(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  timeline: VlmBrainCaseReviewTimeline,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainCustomerExportFirewall {
  const debtMatrix = buildDebtMatrix(capsule, handoff, queue, timeline, result);
  const releaseState = releaseStateFromDebt(debtMatrix, timeline);
  const blockerCount = debtMatrix.filter((debt) => debt.severity === "blocker").length;
  const reviewCount = debtMatrix.filter((debt) => debt.severity === "review").length;

  return {
    schemaVersion: "vlm-brain-customer-export-firewall-v1-pass213",
    firewallMode: "customer_export_preview_gate",
    firewallId: stableId(`VLM-CUSTOMER-EXPORT-FIREWALL-${capsule.capsuleId}-${releaseState}`),
    createdAt: nowIso,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    handoffId: handoff.handoffId,
    queueId: queue.queueId,
    timelineId: timeline.timelineId,
    releaseState,
    customerVisibility: visibilityForRelease(releaseState),
    pdfRouteGate: pdfGateForRelease(releaseState),
    evidenceCoverageScore: evidenceCoverage(result, debtMatrix),
    redactionScore: redactionCoverage(capsule, debtMatrix),
    sourceDebtCount: blockerCount + reviewCount,
    debtMatrix,
    releaseChecklist: [
      "refresh or attach second source for stale/partial reads",
      "persist capsule, handoff, queue and timeline before customer export",
      "keep public copy redacted and limited to review/anomaly/source-confidence wording",
      "do not enable binary PDF download until durable case storage exists",
    ],
    customerCopyBoundary:
      "Customer export is a redacted review brief only. It is not a final verdict, not financial advice and not a safety certificate.",
    operatorBoundary:
      "Operator-only fields remain internal: source debt, action queue, case timeline, raw blockers and private scoring context.",
  };
}

export function serializeVlmBrainCustomerExportFirewall(firewall: VlmBrainCustomerExportFirewall) {
  return JSON.stringify(firewall, null, 2);
}

export const PASS213_VLM_BRAIN_CUSTOMER_EXPORT_FIREWALL_CONTRACT = true;
