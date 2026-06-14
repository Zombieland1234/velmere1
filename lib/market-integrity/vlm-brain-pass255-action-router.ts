import type {
  VlmBrainPass254HandoffLaneId,
  VlmBrainPass254HandoffLaneState,
  VlmBrainPass254HandoffPriority,
  VlmBrainPass254ReleaseCockpitSourceLedgerHandoff,
} from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass255ActionPhaseId =
  | "evidence_intake"
  | "browser_replay"
  | "export_freeze"
  | "access_copy";

export type VlmBrainPass255ArtifactState = "missing" | "review_required" | "operator_preview";

export type VlmBrainPass255ActionPhase = {
  id: VlmBrainPass255ActionPhaseId;
  label: string;
  state: VlmBrainPass254HandoffLaneState;
  priority: VlmBrainPass254HandoffPriority;
  owner: "source" | "qa" | "report" | "access" | "copy";
  lanes: VlmBrainPass254HandoffLaneId[];
  score: number;
  blockerCount: number;
  reviewCount: number;
  operatorCommand: string;
  uiHint: string;
  customerBoundary: string;
};

export type VlmBrainPass255ReplayArtifact = {
  id: string;
  label: string;
  state: VlmBrainPass255ArtifactState;
  required: true;
  reason: string;
};

export type VlmBrainPass255ActionRouter = {
  schemaVersion: "vlm-brain-pass255-action-router-v1";
  actionMode: "operator_action_router_browser_replay_export_freeze";
  actionId: string;
  token: { symbol: string; name: string };
  decision: "hard_block" | "review_lock" | "operator_preview_only";
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  exportFreeze: true;
  walletSecretAllowed: false;
  browserReplayRequired: true;
  phaseCount: number;
  p0Count: number;
  p1Count: number;
  phases: VlmBrainPass255ActionPhase[];
  replayArtifacts: VlmBrainPass255ReplayArtifact[];
  topActions: string[];
  operatorSummary: string;
  customerBoundary: string;
};

const PASS255_SCHEMA = "vlm-brain-pass255-action-router-v1" as const;

function compact(value: unknown, fallback = "PASS255 action router review required", limit = 280) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS255-ACTION-ROUTER", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function priorityFrom(state: VlmBrainPass254HandoffLaneState, score: number): VlmBrainPass254HandoffPriority {
  if (state === "hard_block" || score < 35) return "P0";
  if (state === "review_lock" || score < 64) return "P1";
  if (score < 82) return "P2";
  return "P3";
}

function worstState(states: VlmBrainPass254HandoffLaneState[]): VlmBrainPass254HandoffLaneState {
  if (states.includes("hard_block")) return "hard_block";
  if (states.includes("review_lock")) return "review_lock";
  return "operator_preview";
}

function makePhase(
  handoff: VlmBrainPass254ReleaseCockpitSourceLedgerHandoff,
  input: Omit<VlmBrainPass255ActionPhase, "state" | "priority" | "score" | "blockerCount" | "reviewCount">,
): VlmBrainPass255ActionPhase {
  const lanes = handoff.lanes.filter((lane) => input.lanes.includes(lane.id));
  const state = worstState(lanes.map((lane) => lane.state));
  const score = clampPercent(lanes.reduce((sum, lane) => sum + lane.score, 0) / Math.max(1, lanes.length));
  const blockerCount = lanes.filter((lane) => lane.state === "hard_block").length;
  const reviewCount = lanes.filter((lane) => lane.state === "review_lock").length;

  return {
    ...input,
    state,
    priority: priorityFrom(state, score),
    score,
    blockerCount,
    reviewCount,
    operatorCommand: compact(input.operatorCommand),
    uiHint: compact(input.uiHint),
    customerBoundary: compact(input.customerBoundary),
  };
}

function replayArtifact(
  id: string,
  label: string,
  missing: boolean,
  reason: string,
): VlmBrainPass255ReplayArtifact {
  return {
    id,
    label: compact(label, "Replay artifact", 100),
    state: missing ? "missing" : "review_required",
    required: true,
    reason: compact(reason, "Browser replay proof is required before release.", 220),
  };
}

export function buildVlmBrainPass255ActionRouter(
  handoff: VlmBrainPass254ReleaseCockpitSourceLedgerHandoff,
): VlmBrainPass255ActionRouter {
  const laneState = (laneId: VlmBrainPass254HandoffLaneId) => handoff.lanes.find((lane) => lane.id === laneId)?.state ?? "hard_block";
  const browserMissing = laneState("browser_qa") !== "operator_preview";
  const sourceMissing = laneState("source") !== "operator_preview" || laneState("freshness") !== "operator_preview";
  const pdfMissing = laneState("pdf_preview") !== "operator_preview" || laneState("redaction") !== "operator_preview";
  const accessMissing = laneState("wallet_session") !== "operator_preview" || laneState("customer_copy") !== "operator_preview";

  const phases = [
    makePhase(handoff, {
      id: "evidence_intake",
      label: "Evidence intake first",
      owner: "source",
      lanes: ["source", "freshness", "durable_snapshot"],
      operatorCommand: "Start with source ledger, freshness TTL and durable snapshot contract. Do not move to public copy while any evidence lane is missing or stale.",
      uiHint: "Show source debt and next adapter action above export controls.",
      customerBoundary: "Customer sees only source-confidence wording after review, never raw source payload.",
    }),
    makePhase(handoff, {
      id: "browser_replay",
      label: "Browser replay proof",
      owner: "qa",
      lanes: ["browser_qa"],
      operatorCommand: "Capture real browser replay for modal layering, search portal, Orbit pause, tile drawer scroll, mobile and reduced motion before release.",
      uiHint: "Keep QA evidence as an operator artifact; static guard success is not browser QA.",
      customerBoundary: "QA replay is internal proof, not a public safety badge.",
    }),
    makePhase(handoff, {
      id: "export_freeze",
      label: "Export freeze / report gate",
      owner: "report",
      lanes: ["redaction", "pdf_preview"],
      operatorCommand: "Keep HTML preview operator-only; block binary PDF, raw payload and report download until redaction and source review pass.",
      uiHint: "Render blocked state clearly instead of a fake download route.",
      customerBoundary: "Report preview cannot say final verdict, public safety badge, trading instruction or guaranteed safety.",
    }),
    makePhase(handoff, {
      id: "access_copy",
      label: "Access and customer copy",
      owner: "access",
      lanes: ["wallet_session", "customer_copy"],
      operatorCommand: "Gate Basic/Pro/Advanced access with session entitlement only; never request sensitive wallet recovery credential and never use ROI/public sale language.",
      uiHint: "Keep wallet/session as future controlled access, not a trading or investment promise.",
      customerBoundary: "Customer copy stays anomaly/requires review/source-confidence/missing-data only.",
    }),
  ];

  const replayArtifacts = [
    replayArtifact("modal_layering", "Token modal layering", browserMissing, "Verify chart, Basic/Pro/Advanced, drawer portal and close controls do not fight for z-index."),
    replayArtifact("orbit_pause", "Orbit pause on tile read", browserMissing, "Clicked tile must pause heavy motion and keep the drawer readable."),
    replayArtifact("search_portal", "Search portal containment", sourceMissing, "Dropdown must stay above panels, close on outside click and avoid one-character API spam."),
    replayArtifact("pdf_preview_gate", "PDF preview gate", pdfMissing, "Preview stays HTML/operator-only until source, redaction and browser evidence are attached."),
    replayArtifact("wallet_copy_gate", "Wallet/session copy gate", accessMissing, "Access copy must stay utility-only without sensitive wallet recovery credential, ROI or sale-live wording."),
  ];

  const p0Count = phases.filter((phase) => phase.priority === "P0").length;
  const p1Count = phases.filter((phase) => phase.priority === "P1").length;
  const decision = p0Count > 0 ? "hard_block" : p1Count > 0 ? "review_lock" : "operator_preview_only";
  const topActions = phases
    .filter((phase) => phase.priority === "P0" || phase.priority === "P1")
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.score - b.score)
    .map((phase) => `${phase.priority} · ${phase.label}: ${phase.operatorCommand}`)
    .slice(0, 5);

  return {
    schemaVersion: PASS255_SCHEMA,
    actionMode: "operator_action_router_browser_replay_export_freeze",
    actionId: stableId(`VLM-PASS255-ACTION-${handoff.token.symbol}-${handoff.handoffId}`),
    token: handoff.token,
    decision,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    exportFreeze: true,
    walletSecretAllowed: false,
    browserReplayRequired: true,
    phaseCount: phases.length,
    p0Count,
    p1Count,
    phases,
    replayArtifacts,
    topActions,
    operatorSummary:
      "PASS255 converts the PASS254 handoff into a strict operator action router: evidence intake comes first, browser replay becomes mandatory proof, report export remains frozen, and wallet/customer copy stay utility-only until review clears every lane.",
    customerBoundary:
      "Internal action router only. It cannot enable public export, raw payload export, binary PDF, wallet access or customer copy; it only orders operator work and browser replay evidence.",
  };
}

export const PASS255_VLM_BRAIN_ACTION_ROUTER_CONTRACT = true;
