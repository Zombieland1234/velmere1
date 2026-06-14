import type {
  VlmBrainPass255ActionPhase,
  VlmBrainPass255ActionRouter,
  VlmBrainPass255ReplayArtifact,
} from "./vlm-brain-pass255-action-router";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass256EvidenceRunbookQueueState =
  | "blocked"
  | "capture_required"
  | "review_required"
  | "operator_preview";

export type VlmBrainPass256EvidenceRunbookFreezeId =
  | "public_export"
  | "raw_payload"
  | "binary_pdf"
  | "wallet_access"
  | "customer_copy";

export type VlmBrainPass256EvidenceRunbookQueueItem = {
  id: string;
  label: string;
  owner: VlmBrainPass255ActionPhase["owner"] | "browser" | "release";
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass256EvidenceRunbookQueueState;
  source: "phase" | "browser_artifact" | "freeze_matrix";
  acceptance: string;
  operatorNext: string;
  publicBoundary: string;
};

export type VlmBrainPass256BrowserReplayCheck = {
  id: string;
  label: string;
  state: VlmBrainPass256EvidenceRunbookQueueState;
  required: true;
  acceptance: string;
  failureEffect: string;
};

export type VlmBrainPass256ReleaseFreezeCell = {
  id: VlmBrainPass256EvidenceRunbookFreezeId;
  label: string;
  state: "blocked";
  reason: string;
  releaseCondition: string;
};

export type VlmBrainPass256EvidenceRunbook = {
  schemaVersion: "vlm-brain-pass256-evidence-runbook-v1";
  runbookMode: "operator_evidence_runbook_browser_replay_quarantine";
  runbookId: string;
  token: { symbol: string; name: string };
  decision: "blocked" | "capture_required" | "review_required" | "operator_preview";
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  browserReplayRequired: true;
  replayEvidenceAttached: false;
  exportQuarantine: true;
  queueCount: number;
  captureRequiredCount: number;
  blockedCount: number;
  queue: VlmBrainPass256EvidenceRunbookQueueItem[];
  browserReplayChecklist: VlmBrainPass256BrowserReplayCheck[];
  releaseFreezeMatrix: VlmBrainPass256ReleaseFreezeCell[];
  nextOperatorMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS256_SCHEMA = "vlm-brain-pass256-evidence-runbook-v1" as const;

function compact(value: unknown, fallback = "PASS256 evidence runbook review required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS256-EVIDENCE-RUNBOOK", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function queueStateFromPhase(phase: VlmBrainPass255ActionPhase): VlmBrainPass256EvidenceRunbookQueueState {
  if (phase.state === "hard_block" || phase.priority === "P0") return "blocked";
  if (phase.id === "browser_replay" || phase.blockerCount > 0) return "capture_required";
  if (phase.state === "review_lock" || phase.priority === "P1") return "review_required";
  return "operator_preview";
}

function queueStateFromArtifact(artifact: VlmBrainPass255ReplayArtifact): VlmBrainPass256EvidenceRunbookQueueState {
  if (artifact.state === "missing") return "capture_required";
  if (artifact.state === "review_required") return "review_required";
  return "operator_preview";
}

function priorityFromQueueState(state: VlmBrainPass256EvidenceRunbookQueueState): VlmBrainPass254HandoffPriority {
  if (state === "blocked" || state === "capture_required") return "P0";
  if (state === "review_required") return "P1";
  return "P3";
}

function phaseQueueItem(phase: VlmBrainPass255ActionPhase): VlmBrainPass256EvidenceRunbookQueueItem {
  const state = queueStateFromPhase(phase);
  return {
    id: stableId(`PASS256-PHASE-${phase.id}`),
    label: compact(phase.label, "Operator phase", 120),
    owner: phase.owner,
    priority: priorityFromQueueState(state),
    state,
    source: "phase",
    acceptance: compact(
      `Close ${phase.label} only when blocker count is zero, review count is cleared and the lane has attached operator proof.`,
      "Operator proof required before release.",
      240,
    ),
    operatorNext: compact(phase.operatorCommand, "Review the phase and attach proof.", 260),
    publicBoundary: compact(phase.customerBoundary, "No customer copy until review clears.", 240),
  };
}

function artifactQueueItem(artifact: VlmBrainPass255ReplayArtifact): VlmBrainPass256EvidenceRunbookQueueItem {
  const state = queueStateFromArtifact(artifact);
  return {
    id: stableId(`PASS256-ARTIFACT-${artifact.id}`),
    label: compact(artifact.label, "Browser replay artifact", 120),
    owner: "browser",
    priority: priorityFromQueueState(state),
    state,
    source: "browser_artifact",
    acceptance: compact(`Attach replay evidence for ${artifact.label} and mark the exact viewport/device path reviewed.`, "Replay evidence required.", 240),
    operatorNext: compact(artifact.reason, "Capture and review browser replay evidence.", 260),
    publicBoundary: "Browser replay evidence remains operator-only and never becomes public approval language.",
  };
}

function freezeCell(id: VlmBrainPass256EvidenceRunbookFreezeId, label: string, reason: string): VlmBrainPass256ReleaseFreezeCell {
  return {
    id,
    label,
    state: "blocked",
    reason: compact(reason, "Release output remains blocked.", 220),
    releaseCondition: "Requires source ledger, redaction, durable case snapshot and real browser replay review before promotion.",
  };
}

export function buildVlmBrainPass256EvidenceRunbook(
  actionRouter: VlmBrainPass255ActionRouter,
): VlmBrainPass256EvidenceRunbook {
  const phaseQueue = actionRouter.phases.map(phaseQueueItem);
  const artifactQueue = actionRouter.replayArtifacts.map(artifactQueueItem);
  const releaseFreezeMatrix = [
    freezeCell("public_export", "Public export", "Public-facing export cannot be enabled from static guards or preview-only evidence."),
    freezeCell("raw_payload", "Raw payload", "Raw evidence payloads stay inside the operator boundary and require redaction before any preview."),
    freezeCell("binary_pdf", "Binary PDF", "Binary PDF route stays blocked until report data is durable and reviewed."),
    freezeCell("wallet_access", "Wallet/session access", "Wallet-gated access needs server entitlement and safe session proof before release."),
    freezeCell("customer_copy", "Customer copy", "Customer copy stays limited to anomaly, review, source confidence and missing-data language."),
  ];

  const freezeQueue = releaseFreezeMatrix.map<VlmBrainPass256EvidenceRunbookQueueItem>((cell) => ({
    id: stableId(`PASS256-FREEZE-${cell.id}`),
    label: cell.label,
    owner: "release",
    priority: "P0",
    state: "blocked",
    source: "freeze_matrix",
    acceptance: cell.releaseCondition,
    operatorNext: cell.reason,
    publicBoundary: "Blocked output is shown as blocked; it must not look like a disabled feature that is already production-ready.",
  }));

  const queue = [...phaseQueue, ...artifactQueue, ...freezeQueue].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
    return priorityOrder[a.priority] - priorityOrder[b.priority] || a.label.localeCompare(b.label);
  });

  const browserReplayChecklist = actionRouter.replayArtifacts.map<VlmBrainPass256BrowserReplayCheck>((artifact) => {
    const state = queueStateFromArtifact(artifact);
    return {
      id: stableId(`PASS256-REPLAY-${artifact.id}`),
      label: compact(artifact.label, "Replay check", 120),
      state,
      required: true,
      acceptance: compact(`Replay must show ${artifact.label} under desktop, mobile or reduced-motion path relevant to that artifact.`, "Replay evidence required.", 220),
      failureEffect: "Keep release in quarantine and keep export controls blocked.",
    };
  });

  const blockedCount = queue.filter((item) => item.state === "blocked").length;
  const captureRequiredCount = queue.filter((item) => item.state === "capture_required").length;
  const reviewRequiredCount = queue.filter((item) => item.state === "review_required").length;
  const decision = blockedCount > 0 ? "blocked" : captureRequiredCount > 0 ? "capture_required" : reviewRequiredCount > 0 ? "review_required" : "operator_preview";
  const firstP0 = queue.find((item) => item.priority === "P0");
  const nextOperatorMove = firstP0
    ? `${firstP0.priority} · ${firstP0.label}: ${firstP0.operatorNext}`
    : "Review remaining operator-preview lanes and keep public outputs blocked until a signed release decision exists.";

  return {
    schemaVersion: PASS256_SCHEMA,
    runbookMode: "operator_evidence_runbook_browser_replay_quarantine",
    runbookId: stableId(`VLM-PASS256-RUNBOOK-${actionRouter.token.symbol}-${actionRouter.actionId}`),
    token: actionRouter.token,
    decision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    browserReplayRequired: true,
    replayEvidenceAttached: false,
    exportQuarantine: true,
    queueCount: queue.length,
    captureRequiredCount,
    blockedCount,
    queue,
    browserReplayChecklist,
    releaseFreezeMatrix,
    nextOperatorMove,
    operatorSummary:
      "PASS256 turns the action router into an evidence runbook: every release blocker becomes a visible queue item, browser replay is a required artifact, and export outputs stay quarantined until storage, redaction and review are attached.",
    customerBoundary:
      "Internal evidence runbook only. It cannot unlock public export, raw payload export, binary PDF, wallet access or customer copy; it only orders operator proof and replay capture.",
  };
}

export const PASS256_VLM_BRAIN_EVIDENCE_RUNBOOK_CONTRACT = true;
