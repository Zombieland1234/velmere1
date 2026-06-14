import type {
  VlmBrainPass256EvidenceRunbook,
  VlmBrainPass256EvidenceRunbookQueueItem,
  VlmBrainPass256EvidenceRunbookQueueState,
} from "./vlm-brain-pass256-evidence-runbook";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass257EvidenceSlaTier =
  | "immediate_blocker"
  | "same_session_capture"
  | "operator_review"
  | "preview_parking";

export type VlmBrainPass257ExceptionId =
  | "public_export"
  | "raw_payload"
  | "binary_pdf"
  | "wallet_access"
  | "customer_copy"
  | "release_override";

export type VlmBrainPass257EvidenceTimelineItem = {
  id: string;
  lane: string;
  owner: VlmBrainPass256EvidenceRunbookQueueItem["owner"];
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass256EvidenceRunbookQueueState;
  slaTier: VlmBrainPass257EvidenceSlaTier;
  reviewWindow: string;
  escalation: string;
  acceptance: string;
  publicBoundary: string;
};

export type VlmBrainPass257EscalationLane = {
  id: string;
  label: string;
  owner: VlmBrainPass256EvidenceRunbookQueueItem["owner"] | "release";
  blockerCount: number;
  captureCount: number;
  nextAction: string;
};

export type VlmBrainPass257ExceptionFirewallCell = {
  id: VlmBrainPass257ExceptionId;
  label: string;
  exceptionAllowed: false;
  state: "frozen";
  reason: string;
  requiredProof: string;
};

export type VlmBrainPass257EvidenceSlaTimeline = {
  schemaVersion: "vlm-brain-pass257-evidence-sla-timeline-v1";
  mode: "operator_evidence_sla_timeline_exception_firewall";
  timelineId: string;
  token: { symbol: string; name: string };
  decision: "frozen" | "blocked" | "capture_required" | "review_required" | "operator_preview";
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  exceptionOverrideAllowed: false;
  releaseFreezeActive: true;
  timelineCount: number;
  immediateBlockerCount: number;
  sameSessionCaptureCount: number;
  timeline: VlmBrainPass257EvidenceTimelineItem[];
  escalationLanes: VlmBrainPass257EscalationLane[];
  exceptionFirewall: VlmBrainPass257ExceptionFirewallCell[];
  nextSlaMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS257_SCHEMA = "vlm-brain-pass257-evidence-sla-timeline-v1" as const;

function compact(value: unknown, fallback = "PASS257 evidence SLA timeline review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS257-SLA-TIMELINE", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slaTierFor(item: VlmBrainPass256EvidenceRunbookQueueItem): VlmBrainPass257EvidenceSlaTier {
  if (item.state === "blocked" || item.priority === "P0") return "immediate_blocker";
  if (item.state === "capture_required") return "same_session_capture";
  if (item.state === "review_required" || item.priority === "P1") return "operator_review";
  return "preview_parking";
}

function reviewWindowFor(tier: VlmBrainPass257EvidenceSlaTier) {
  if (tier === "immediate_blocker") return "Resolve before any release review can continue.";
  if (tier === "same_session_capture") return "Capture during the same browser replay pass before promotion.";
  if (tier === "operator_review") return "Review after P0 capture is complete and before customer wording.";
  return "Keep parked as operator preview; do not promote to public output.";
}

function escalationFor(item: VlmBrainPass256EvidenceRunbookQueueItem, tier: VlmBrainPass257EvidenceSlaTier) {
  if (tier === "immediate_blocker") return `Escalate ${item.owner} lane and keep release frozen until acceptance proof is attached.`;
  if (tier === "same_session_capture") return `Capture ${item.label} proof and link it to the browser replay notes.`;
  if (tier === "operator_review") return `Send ${item.label} through operator review after P0 evidence clears.`;
  return `Keep ${item.label} visible as preview-only context.`;
}

function timelineItem(item: VlmBrainPass256EvidenceRunbookQueueItem): VlmBrainPass257EvidenceTimelineItem {
  const tier = slaTierFor(item);
  return {
    id: stableId(`PASS257-TIMELINE-${item.id}`),
    lane: compact(item.label, "Evidence lane", 140),
    owner: item.owner,
    priority: item.priority,
    state: item.state,
    slaTier: tier,
    reviewWindow: reviewWindowFor(tier),
    escalation: compact(escalationFor(item, tier), "Escalate and attach operator proof before release.", 260),
    acceptance: compact(item.acceptance, "Acceptance proof required.", 260),
    publicBoundary: compact(item.publicBoundary, "Operator-only proof, not public release copy.", 240),
  };
}

function exceptionCell(id: VlmBrainPass257ExceptionId, label: string, reason: string): VlmBrainPass257ExceptionFirewallCell {
  return {
    id,
    label,
    exceptionAllowed: false,
    state: "frozen",
    reason: compact(reason, "Exception path remains frozen.", 240),
    requiredProof: "Requires durable source snapshot, redaction manifest, browser replay evidence and operator review before any future release decision.",
  };
}

function ownerOrder(owner: VlmBrainPass256EvidenceRunbookQueueItem["owner"] | "release") {
  const order = { source: 0, redaction: 1, browser: 2, storage: 3, report: 4, wallet: 5, release: 6 } as Record<string, number>;
  return order[String(owner)] ?? 9;
}

function buildEscalationLanes(timeline: VlmBrainPass257EvidenceTimelineItem[]): VlmBrainPass257EscalationLane[] {
  const owners = Array.from(new Set(timeline.map((item) => item.owner))).sort((a, b) => ownerOrder(a) - ownerOrder(b));
  return owners.map((owner) => {
    const items = timeline.filter((item) => item.owner === owner);
    const blockerCount = items.filter((item) => item.slaTier === "immediate_blocker").length;
    const captureCount = items.filter((item) => item.slaTier === "same_session_capture").length;
    const first = items.find((item) => item.slaTier === "immediate_blocker") ?? items.find((item) => item.slaTier === "same_session_capture") ?? items[0];
    return {
      id: stableId(`PASS257-ESCALATION-${owner}`),
      label: `${String(owner).toUpperCase()} lane`,
      owner,
      blockerCount,
      captureCount,
      nextAction: first ? compact(first.escalation, "Review lane and attach proof.", 220) : "Review lane and attach proof.",
    };
  });
}

export function buildVlmBrainPass257EvidenceSlaTimeline(
  runbook: VlmBrainPass256EvidenceRunbook,
): VlmBrainPass257EvidenceSlaTimeline {
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
  const tierOrder = { immediate_blocker: 0, same_session_capture: 1, operator_review: 2, preview_parking: 3 } as const;
  const timeline = runbook.queue
    .map(timelineItem)
    .sort((a, b) => tierOrder[a.slaTier] - tierOrder[b.slaTier] || priorityOrder[a.priority] - priorityOrder[b.priority] || a.lane.localeCompare(b.lane));

  const immediateBlockerCount = timeline.filter((item) => item.slaTier === "immediate_blocker").length;
  const sameSessionCaptureCount = timeline.filter((item) => item.slaTier === "same_session_capture").length;
  const reviewCount = timeline.filter((item) => item.slaTier === "operator_review").length;
  const topItem = timeline[0];
  const decision = runbook.exportQuarantine || immediateBlockerCount > 0
    ? "frozen"
    : sameSessionCaptureCount > 0
      ? "capture_required"
      : reviewCount > 0
        ? "review_required"
        : "operator_preview";

  const exceptionFirewall = [
    exceptionCell("public_export", "Public export", "Static evidence runbooks cannot unlock a public-facing export path."),
    exceptionCell("raw_payload", "Raw payload", "Raw evidence stays inside the operator boundary until redaction and review are complete."),
    exceptionCell("binary_pdf", "Binary PDF", "PDF download remains unavailable until durable report data and replay proof exist."),
    exceptionCell("wallet_access", "Wallet/session access", "Access gating needs safe server-side entitlement and session proof before release."),
    exceptionCell("customer_copy", "Customer copy", "Customer wording remains limited to anomaly, review pressure, source confidence and missing-data boundaries."),
    exceptionCell("release_override", "Release override", "No operator shortcut can bypass evidence, redaction, storage and replay requirements."),
  ];

  return {
    schemaVersion: PASS257_SCHEMA,
    mode: "operator_evidence_sla_timeline_exception_firewall",
    timelineId: stableId(`VLM-PASS257-SLA-${runbook.token.symbol}-${runbook.runbookId}`),
    token: runbook.token,
    decision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    exceptionOverrideAllowed: false,
    releaseFreezeActive: true,
    timelineCount: timeline.length,
    immediateBlockerCount,
    sameSessionCaptureCount,
    timeline,
    escalationLanes: buildEscalationLanes(timeline),
    exceptionFirewall,
    nextSlaMove: topItem
      ? `${topItem.slaTier} · ${topItem.lane}: ${topItem.escalation}`
      : "Keep release frozen and attach reviewed proof before any future promotion.",
    operatorSummary:
      "PASS257 converts the evidence runbook into a release SLA timeline: P0 blockers stay first, browser capture has its own replay lane, and exception paths remain frozen until durable source, redaction and review proof exist.",
    customerBoundary:
      "Operator timeline only. It orders evidence and escalation work; it does not enable public export, raw payload export, binary PDF, wallet/session access or customer copy.",
  };
}

export const PASS257_VLM_BRAIN_EVIDENCE_SLA_TIMELINE_CONTRACT = true;
