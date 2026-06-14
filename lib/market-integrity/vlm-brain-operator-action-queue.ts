import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainCapsuleHandoff } from "./vlm-brain-capsule-handoff";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainOperatorActionPriority = "P1" | "P2" | "P3";
export type VlmBrainOperatorActionLane =
  | "source_refresh"
  | "second_source"
  | "missing_data"
  | "redaction"
  | "report_preview"
  | "case_file";

export type VlmBrainOperatorActionQueueStatus =
  | "blocked_by_sources"
  | "needs_operator_triage"
  | "ready_for_case_review";

export type VlmBrainOperatorAction = {
  id: string;
  lane: VlmBrainOperatorActionLane;
  priority: VlmBrainOperatorActionPriority;
  owner: "operator" | "system_guard";
  label: string;
  detail: string;
  dueWindow: "before_public_brief" | "before_pdf_preview" | "case_file_backlog";
  exportImpact: "blocks_export" | "requires_review" | "documents_context";
};

export type VlmBrainOperatorActionQueue = {
  schemaVersion: "vlm-brain-operator-action-queue-v1-pass211";
  queueMode: "operator_case_preview";
  queueId: string;
  createdAt: string;
  token: {
    symbol: string;
    name: string;
  };
  capsuleId: string;
  handoffId: string;
  status: VlmBrainOperatorActionQueueStatus;
  actions: VlmBrainOperatorAction[];
  exportGate: {
    pdfMode: "not_generated";
    durableStorage: "not_connected" | "required_before_customer_export";
    customerCopy: "blocked_until_review" | "operator_summary_only";
  };
  safeCopyBoundary: string;
};

function compact(value: unknown, fallback = "review required", limit = 260) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-ACTION", 180)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hasInsufficientData(result: TokenRiskResult) {
  return (result.signals ?? []).some((signal) => signal.id === "insufficient_data");
}

function addAction(
  actions: VlmBrainOperatorAction[],
  action: Omit<VlmBrainOperatorAction, "id"> & { idSeed: string },
) {
  const id = stableId(action.idSeed);
  if (actions.some((item) => item.id === id)) return;
  actions.push({
    id,
    lane: action.lane,
    priority: action.priority,
    owner: action.owner,
    label: compact(action.label, "operator action", 140),
    detail: compact(action.detail, "manual review required", 320),
    dueWindow: action.dueWindow,
    exportImpact: action.exportImpact,
  });
}

function queueStatus(actions: VlmBrainOperatorAction[]): VlmBrainOperatorActionQueueStatus {
  if (actions.some((action) => action.exportImpact === "blocks_export" || action.priority === "P1")) {
    return "blocked_by_sources";
  }
  if (actions.some((action) => action.exportImpact === "requires_review" || action.priority === "P2")) {
    return "needs_operator_triage";
  }
  return "ready_for_case_review";
}

export function buildVlmBrainOperatorActionQueue(
  capsule: VlmBrainReportCapsuleEnvelope,
  handoff: VlmBrainCapsuleHandoff,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainOperatorActionQueue {
  const actions: VlmBrainOperatorAction[] = [];
  const sourceMode = compact(result.dataQuality, "partial");
  const limitations = result.metaModel?.limitations ?? [];

  if (handoff.freshness.state === "stale" || handoff.freshness.state === "unknown") {
    addAction(actions, {
      idSeed: `${capsule.capsuleId}-refresh-source`,
      lane: "source_refresh",
      priority: "P1",
      owner: "operator",
      label: "Refresh source before any public brief",
      detail: `Freshness is ${handoff.freshness.label}. Re-run the source adapter and compare the tile with current market/source state before export.`,
      dueWindow: "before_public_brief",
      exportImpact: "blocks_export",
    });
  }

  if (sourceMode !== "live") {
    addAction(actions, {
      idSeed: `${capsule.capsuleId}-second-source-${sourceMode}`,
      lane: "second_source",
      priority: "P1",
      owner: "operator",
      label: "Confirm with a second independent source",
      detail: `The tile is based on ${sourceMode} data. Keep the readout internal until a second source confirms the same risk driver.`,
      dueWindow: "before_public_brief",
      exportImpact: "blocks_export",
    });
  }

  if (limitations.length > 0 || hasInsufficientData(result)) {
    addAction(actions, {
      idSeed: `${capsule.capsuleId}-missing-data`,
      lane: "missing_data",
      priority: "P2",
      owner: "operator",
      label: "Resolve missing-data blockers",
      detail: `${Math.max(limitations.length, hasInsufficientData(result) ? 1 : 0)} missing-data blocker(s) remain. Explain what is unknown instead of converting absence of data into a calm verdict.`,
      dueWindow: "before_pdf_preview",
      exportImpact: "requires_review",
    });
  }

  if (capsule.exportReadiness !== "ready") {
    addAction(actions, {
      idSeed: `${capsule.capsuleId}-redaction-boundary`,
      lane: "redaction",
      priority: capsule.exportReadiness === "blocked" ? "P1" : "P2",
      owner: "system_guard",
      label: "Keep capsule inside redacted preview mode",
      detail: capsule.dataBoundary,
      dueWindow: "before_pdf_preview",
      exportImpact: capsule.exportReadiness === "blocked" ? "blocks_export" : "requires_review",
    });
  }

  if (handoff.reportBridge.status !== "blocked") {
    addAction(actions, {
      idSeed: `${capsule.capsuleId}-report-preview`,
      lane: "report_preview",
      priority: "P3",
      owner: "operator",
      label: "Prepare operator-only report preview",
      detail: "Use the public brief only after source review; keep the operator memo in internal case context.",
      dueWindow: "case_file_backlog",
      exportImpact: "documents_context",
    });
  }

  addAction(actions, {
    idSeed: `${capsule.capsuleId}-case-file`,
    lane: "case_file",
    priority: actions.length ? "P2" : "P3",
    owner: "operator",
    label: "Attach tile capsule to case file",
    detail: "Store the capsule id, handoff id, action queue and source state together so the report path can be audited later.",
    dueWindow: actions.length ? "before_pdf_preview" : "case_file_backlog",
    exportImpact: actions.length ? "requires_review" : "documents_context",
  });

  const status = queueStatus(actions);

  return {
    schemaVersion: "vlm-brain-operator-action-queue-v1-pass211",
    queueMode: "operator_case_preview",
    queueId: stableId(`VLM-ACTION-QUEUE-${capsule.capsuleId}-${status}`),
    createdAt: nowIso,
    token: capsule.token,
    capsuleId: capsule.capsuleId,
    handoffId: handoff.handoffId,
    status,
    actions: actions.slice(0, 6),
    exportGate: {
      pdfMode: "not_generated",
      durableStorage: "required_before_customer_export",
      customerCopy: status === "ready_for_case_review" ? "operator_summary_only" : "blocked_until_review",
    },
    safeCopyBoundary:
      "Operator action queue only: no customer-facing verdict, no safety certificate, no investment advice, no raw payload export.",
  };
}

export function serializeVlmBrainOperatorActionQueue(queue: VlmBrainOperatorActionQueue) {
  return JSON.stringify(queue, null, 2);
}

export const PASS211_VLM_BRAIN_OPERATOR_ACTION_QUEUE_CONTRACT = true;
