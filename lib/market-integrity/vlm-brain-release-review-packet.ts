import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCapsuleHandoff } from "./vlm-brain-capsule-handoff";
import type { VlmBrainCaseReviewTimeline } from "./vlm-brain-case-review-timeline";
import type { VlmBrainCustomerExportFirewall } from "./vlm-brain-customer-export-firewall";
import type { VlmBrainOperatorActionQueue } from "./vlm-brain-operator-action-queue";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";
import type { VlmBrainSourceCoverageMatrix } from "./vlm-brain-source-coverage-matrix";

export type VlmBrainReleaseReviewDecision =
  | "hard_block"
  | "operator_review"
  | "internal_preview";

export type VlmBrainReleaseReviewLaneId =
  | "source_coverage"
  | "freshness"
  | "redaction"
  | "durable_case"
  | "customer_copy"
  | "pdf_route";

export type VlmBrainReleaseReviewLaneState = "blocked" | "review" | "ready" | "context";

export type VlmBrainReleaseReviewLane = {
  id: VlmBrainReleaseReviewLaneId;
  label: string;
  state: VlmBrainReleaseReviewLaneState;
  score: number;
  evidence: string;
  releaseImpact: "blocks_customer_export" | "requires_operator_review" | "internal_context" | "allows_internal_preview";
  nextAction: string;
};

export type VlmBrainReleaseReviewPacket = {
  schemaVersion: "vlm-brain-release-review-packet-v1-pass215";
  packetMode: "operator_release_packet_preview";
  packetId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  handoffId: string;
  queueId: string;
  timelineId: string;
  firewallId: string;
  matrixId: string;
  decision: VlmBrainReleaseReviewDecision;
  releaseScore: number;
  pdfPreview: "disabled" | "operator_only";
  customerCopyMode: "hidden" | "redacted_after_review" | "operator_summary_only";
  blockerCount: number;
  reviewCount: number;
  lanes: VlmBrainReleaseReviewLane[];
  checklist: string[];
  operatorSummary: string;
  customerBoundary: string;
  auditBoundary: string;
};

function compact(value: unknown, fallback = "operator review required", limit = 360) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-RELEASE-PACKET", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lane(
  id: VlmBrainReleaseReviewLaneId,
  label: string,
  state: VlmBrainReleaseReviewLaneState,
  score: number,
  evidence: string,
  nextAction: string,
): VlmBrainReleaseReviewLane {
  const releaseImpact: VlmBrainReleaseReviewLane["releaseImpact"] =
    state === "blocked"
      ? "blocks_customer_export"
      : state === "review"
        ? "requires_operator_review"
        : state === "ready"
          ? "allows_internal_preview"
          : "internal_context";

  return {
    id,
    label,
    state,
    score: clampPercent(score),
    evidence: compact(evidence, "release evidence pending"),
    releaseImpact,
    nextAction: compact(nextAction, "keep this lane in operator review before customer export"),
  };
}

function freshnessLane(handoff: VlmBrainCapsuleHandoff): VlmBrainReleaseReviewLane {
  const state: VlmBrainReleaseReviewLaneState =
    handoff.freshness.state === "fresh"
      ? "ready"
      : handoff.freshness.state === "aging"
        ? "review"
        : "blocked";
  return lane(
    "freshness",
    "Freshness lock",
    state,
    state === "ready" ? 84 : state === "review" ? 58 : 28,
    handoff.freshness.label,
    state === "ready"
      ? "Attach the freshness timestamp to the operator case before report preview."
      : "Refresh the market/source adapter and compare with an independent source before customer copy.",
  );
}

function sourceCoverageLane(matrix: VlmBrainSourceCoverageMatrix): VlmBrainReleaseReviewLane {
  const state: VlmBrainReleaseReviewLaneState =
    matrix.blockedLaneCount > 0
      ? "blocked"
      : matrix.missingLaneCount > 0 || matrix.secondSourceRequired
        ? "review"
        : "ready";
  return lane(
    "source_coverage",
    "Source coverage",
    state,
    matrix.overallCoverageScore,
    `${matrix.missingLaneCount} missing lane(s), ${matrix.blockedLaneCount} blocked lane(s), pressure: ${matrix.exportPressure}.`,
    matrix.secondSourceRequired
      ? "Attach second-source evidence and keep missing lanes internal-only."
      : "Keep lane states attached to the case file for audit traceability.",
  );
}

function redactionLane(capsule: VlmBrainReportCapsuleEnvelope, firewall: VlmBrainCustomerExportFirewall): VlmBrainReleaseReviewLane {
  const redactionDebts = firewall.debtMatrix.filter((debt) => debt.lane === "redaction");
  const blocker = redactionDebts.some((debt) => debt.severity === "blocker") || capsule.exportReadiness === "blocked";
  const review = redactionDebts.length > 0 || capsule.exportReadiness !== "ready";
  const state: VlmBrainReleaseReviewLaneState = blocker ? "blocked" : review ? "review" : "ready";
  return lane(
    "redaction",
    "Redaction boundary",
    state,
    firewall.redactionScore,
    `${capsule.redactionRules.length} redaction rule(s); readiness: ${capsule.exportReadiness}; debt: ${redactionDebts.length}.`,
    state === "ready"
      ? "Keep raw payloads, private scoring weights and operator memo out of customer copy."
      : "Review public brief and operator memo split before PDF-ready preview.",
  );
}

function durableCaseLane(timeline: VlmBrainCaseReviewTimeline): VlmBrainReleaseReviewLane {
  const blocked = timeline.ownerGate.durableWrite !== "not_connected" || timeline.ownerGate.timelineStorage === "client_preview_only";
  return lane(
    "durable_case",
    "Durable case store",
    blocked ? "blocked" : "ready",
    blocked ? 32 : 86,
    `Timeline storage: ${timeline.ownerGate.timelineStorage}; durable write: ${timeline.ownerGate.durableWrite}.`,
    "Persist capsule, handoff, queue, timeline, firewall and source matrix ids before customer download.",
  );
}

function customerCopyLane(firewall: VlmBrainCustomerExportFirewall, queue: VlmBrainOperatorActionQueue): VlmBrainReleaseReviewLane {
  const state: VlmBrainReleaseReviewLaneState =
    firewall.customerVisibility === "hidden_until_review"
      ? "blocked"
      : firewall.customerVisibility === "redacted_summary_after_review" || queue.exportGate.customerCopy === "blocked_until_review"
        ? "review"
        : "context";
  return lane(
    "customer_copy",
    "Customer copy mode",
    state,
    state === "blocked" ? 34 : state === "review" ? 62 : 76,
    `Visibility: ${firewall.customerVisibility}; queue gate: ${queue.exportGate.customerCopy}.`,
    "Keep wording as anomaly/source-confidence/missing-data language; no verdict, no certificate, no trading call.",
  );
}

function pdfRouteLane(firewall: VlmBrainCustomerExportFirewall, result: TokenRiskResult): VlmBrainReleaseReviewLane {
  const blockerCount = firewall.debtMatrix.filter((debt) => debt.severity === "blocker").length;
  const state: VlmBrainReleaseReviewLaneState = firewall.pdfRouteGate === "operator_preview_only" && blockerCount === 0 ? "context" : "blocked";
  return lane(
    "pdf_route",
    "PDF route gate",
    state,
    state === "context" ? 60 : 24,
    `PDF route: ${firewall.pdfRouteGate}; data quality: ${result.dataQuality}; blockers: ${blockerCount}.`,
    "Do not enable binary PDF download until durable storage, redaction and source coverage gates are all satisfied.",
  );
}

function releaseDecision(lanes: VlmBrainReleaseReviewLane[]): VlmBrainReleaseReviewDecision {
  if (lanes.some((item) => item.state === "blocked")) return "hard_block";
  if (lanes.some((item) => item.state === "review")) return "operator_review";
  return "internal_preview";
}

function customerCopyMode(decision: VlmBrainReleaseReviewDecision, firewall: VlmBrainCustomerExportFirewall): VlmBrainReleaseReviewPacket["customerCopyMode"] {
  if (decision === "hard_block") return "hidden";
  if (decision === "operator_review" || firewall.customerVisibility === "redacted_summary_after_review") return "redacted_after_review";
  return "operator_summary_only";
}

export function buildVlmBrainReleaseReviewPacket(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  timeline: VlmBrainCaseReviewTimeline,
  firewall: VlmBrainCustomerExportFirewall,
  matrix: VlmBrainSourceCoverageMatrix,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainReleaseReviewPacket {
  const lanes = [
    sourceCoverageLane(matrix),
    freshnessLane(handoff),
    redactionLane(capsule, firewall),
    durableCaseLane(timeline),
    customerCopyLane(firewall, queue),
    pdfRouteLane(firewall, result),
  ];
  const decision = releaseDecision(lanes);
  const blockerCount = lanes.filter((item) => item.state === "blocked").length;
  const reviewCount = lanes.filter((item) => item.state === "review").length;
  const releaseScore = clampPercent(
    lanes.reduce((sum, item) => sum + item.score, 0) / Math.max(1, lanes.length) - blockerCount * 8 - reviewCount * 4,
  );

  return {
    schemaVersion: "vlm-brain-release-review-packet-v1-pass215",
    packetMode: "operator_release_packet_preview",
    packetId: stableId(`VLM-RELEASE-PACKET-${capsule.capsuleId}-${matrix.matrixId}-${decision}`),
    createdAt: nowIso,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    handoffId: handoff.handoffId,
    queueId: queue.queueId,
    timelineId: timeline.timelineId,
    firewallId: firewall.firewallId,
    matrixId: matrix.matrixId,
    decision,
    releaseScore,
    pdfPreview: decision === "internal_preview" ? "operator_only" : "disabled",
    customerCopyMode: customerCopyMode(decision, firewall),
    blockerCount,
    reviewCount,
    lanes,
    checklist: [
      "Confirm live/fresh source state and attach timestamp.",
      "Resolve blocked or missing source coverage lanes.",
      "Run redaction review before PDF-ready HTML or binary export.",
      "Persist operator case ids before any customer download route.",
      "Keep public wording as review/source-confidence language only.",
    ],
    operatorSummary:
      decision === "hard_block"
        ? "Release remains blocked. Keep the tile inside operator review until source coverage, redaction and durable-case gates are resolved."
        : decision === "operator_review"
          ? "Operator review is required before customer-visible copy. Internal preview may proceed only with redaction and source context attached."
          : "Internal operator preview can proceed. Customer export still needs durable storage, redaction and final release approval.",
    customerBoundary:
      "Customer surfaces may receive only redacted, reviewed anomaly/source-confidence summaries. No raw payloads, operator debt, final verdicts, certificates or financial advice.",
    auditBoundary:
      "Release packet is a client-side operator preview until capsule, handoff, queue, timeline, firewall and source matrix are written to durable storage.",
  };
}

export function serializeVlmBrainReleaseReviewPacket(packet: VlmBrainReleaseReviewPacket) {
  return JSON.stringify(packet, null, 2);
}

export const PASS215_VLM_BRAIN_RELEASE_REVIEW_PACKET_CONTRACT = true;
