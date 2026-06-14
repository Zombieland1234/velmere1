import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCapsuleHandoff } from "./vlm-brain-capsule-handoff";
import type { VlmBrainOperatorActionQueue, VlmBrainOperatorAction } from "./vlm-brain-operator-action-queue";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainCaseReviewTimelineStatus =
  | "blocked_by_source"
  | "operator_review"
  | "ready_for_internal_case";

export type VlmBrainCaseReviewEventStatus = "blocked" | "review" | "logged" | "ready";

export type VlmBrainCaseReviewTimelineEvent = {
  id: string;
  order: number;
  lane:
    | "capsule"
    | "freshness"
    | "action"
    | "redaction"
    | "report_gate"
    | "case_file";
  status: VlmBrainCaseReviewEventStatus;
  actor: "system_guard" | "operator" | "report_bridge";
  title: string;
  detail: string;
  dueWindow: "now" | "before_public_brief" | "before_pdf_preview" | "case_file_backlog";
  exportImpact: "blocks_export" | "requires_review" | "documents_context" | "allows_internal_preview";
};

export type VlmBrainCaseReviewTimeline = {
  schemaVersion: "vlm-brain-case-review-timeline-v1-pass212";
  timelineMode: "operator_case_timeline_preview";
  timelineId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  handoffId: string;
  queueId: string;
  status: VlmBrainCaseReviewTimelineStatus;
  events: VlmBrainCaseReviewTimelineEvent[];
  ownerGate: {
    owner: "operator";
    timelineStorage: "client_preview_only";
    durableWrite: "not_connected" | "required_before_customer_export";
    customerVisibility: "hidden_until_review" | "operator_summary_only";
  };
  exportGate: {
    pdfMode: "not_generated";
    customerExport: "blocked_until_sources" | "blocked_until_redaction" | "internal_preview_only";
    auditRequirement: "durable_case_timeline_required";
  };
  safeCopyBoundary: string;
};

function compact(value: unknown, fallback = "manual review required", limit = 340) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-TIMELINE", 220)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function timelineStatus(queue: VlmBrainOperatorActionQueue, handoff: VlmBrainCapsuleHandoff): VlmBrainCaseReviewTimelineStatus {
  if (queue.status === "blocked_by_sources" || handoff.reportBridge.status === "blocked") return "blocked_by_source";
  if (queue.status === "needs_operator_triage" || handoff.reportBridge.status === "review") return "operator_review";
  return "ready_for_internal_case";
}

function eventStatus(action: VlmBrainOperatorAction): VlmBrainCaseReviewEventStatus {
  if (action.exportImpact === "blocks_export" || action.priority === "P1") return "blocked";
  if (action.exportImpact === "requires_review" || action.priority === "P2") return "review";
  return "logged";
}

function eventFromAction(action: VlmBrainOperatorAction, order: number): VlmBrainCaseReviewTimelineEvent {
  return {
    id: stableId(`timeline-${action.id}-${order}`),
    order,
    lane: action.lane === "redaction" ? "redaction" : action.lane === "report_preview" ? "report_gate" : action.lane === "case_file" ? "case_file" : "action",
    status: eventStatus(action),
    actor: action.owner,
    title: compact(`${action.priority} · ${action.label}`, "operator action", 160),
    detail: action.detail,
    dueWindow: action.dueWindow === "before_public_brief" ? "before_public_brief" : action.dueWindow === "before_pdf_preview" ? "before_pdf_preview" : "case_file_backlog",
    exportImpact: action.exportImpact,
  };
}

export function buildVlmBrainCaseReviewTimeline(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  queue: VlmBrainOperatorActionQueue,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainCaseReviewTimeline {
  const status = timelineStatus(queue, handoff);
  const baseEvents: VlmBrainCaseReviewTimelineEvent[] = [
    {
      id: stableId(`${capsule.capsuleId}-capsule-built`),
      order: 1,
      lane: "capsule",
      status: capsule.exportReadiness === "ready" ? "ready" : capsule.exportReadiness === "blocked" ? "blocked" : "review",
      actor: "system_guard",
      title: "Capsule created in redacted preview mode",
      detail: `Schema ${capsule.schemaVersion}; source ${result.dataQuality}; readiness ${capsule.exportReadiness}.`,
      dueWindow: "now",
      exportImpact: capsule.exportReadiness === "blocked" ? "blocks_export" : capsule.exportReadiness === "review" ? "requires_review" : "documents_context",
    },
    {
      id: stableId(`${handoff.handoffId}-freshness`),
      order: 2,
      lane: "freshness",
      status: handoff.freshness.state === "fresh" ? "logged" : handoff.freshness.state === "aging" ? "review" : "blocked",
      actor: "report_bridge",
      title: "Source freshness checked before report handoff",
      detail: `${handoff.freshness.label}; report bridge status ${handoff.reportBridge.status}.`,
      dueWindow: handoff.freshness.state === "fresh" ? "case_file_backlog" : "before_public_brief",
      exportImpact: handoff.freshness.state === "fresh" ? "documents_context" : "blocks_export",
    },
  ];

  const actionEvents = queue.actions.slice(0, 6).map((action, index) => eventFromAction(action, index + 3));
  const finalOrder = actionEvents.length + 3;
  const caseEvent: VlmBrainCaseReviewTimelineEvent = {
    id: stableId(`${queue.queueId}-case-timeline-gate`),
    order: finalOrder,
    lane: "case_file",
    status: status === "ready_for_internal_case" ? "ready" : status === "operator_review" ? "review" : "blocked",
    actor: "operator",
    title: "Case timeline gate before any customer export",
    detail: "Attach capsule, handoff, queue and source state to a durable case timeline before report download is enabled.",
    dueWindow: status === "ready_for_internal_case" ? "case_file_backlog" : "before_pdf_preview",
    exportImpact: status === "ready_for_internal_case" ? "allows_internal_preview" : "requires_review",
  };

  const customerExport = status === "blocked_by_source"
    ? "blocked_until_sources"
    : status === "operator_review"
      ? "blocked_until_redaction"
      : "internal_preview_only";

  return {
    schemaVersion: "vlm-brain-case-review-timeline-v1-pass212",
    timelineMode: "operator_case_timeline_preview",
    timelineId: stableId(`VLM-CASE-TIMELINE-${capsule.capsuleId}-${queue.status}`),
    createdAt: nowIso,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    handoffId: handoff.handoffId,
    queueId: queue.queueId,
    status,
    events: [...baseEvents, ...actionEvents, caseEvent].slice(0, 10),
    ownerGate: {
      owner: "operator",
      timelineStorage: "client_preview_only",
      durableWrite: "required_before_customer_export",
      customerVisibility: status === "ready_for_internal_case" ? "operator_summary_only" : "hidden_until_review",
    },
    exportGate: {
      pdfMode: "not_generated",
      customerExport,
      auditRequirement: "durable_case_timeline_required",
    },
    safeCopyBoundary:
      "Case timeline preview only: no customer-facing verdict, no safety certificate, no investment advice and no raw payload export.",
  };
}

export function serializeVlmBrainCaseReviewTimeline(timeline: VlmBrainCaseReviewTimeline) {
  return JSON.stringify(timeline, null, 2);
}

export const PASS212_VLM_BRAIN_CASE_REVIEW_TIMELINE_CONTRACT = true;
