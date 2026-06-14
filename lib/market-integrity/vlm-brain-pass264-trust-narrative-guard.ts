import type {
  VlmBrainPass263CandidateLane,
  VlmBrainPass263ReleaseCandidateTrustBoard,
  VlmBrainPass263TrustCue,
} from "./vlm-brain-pass263-release-candidate-trust-board";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass264NarrativeStageType =
  | "context"
  | "evidence"
  | "boundary"
  | "operator_action"
  | "surface_lock";

export type VlmBrainPass264DarkPatternRisk =
  | "urgency_pressure"
  | "certainty_overreach"
  | "badge_theatre"
  | "hidden_missing_data"
  | "access_shortcut";

export type VlmBrainPass264NarrativeStage = {
  id: string;
  stage: VlmBrainPass264NarrativeStageType;
  label: string;
  priority: VlmBrainPass254HandoffPriority;
  sourceCueRef: string;
  operatorCopy: string;
  customerSafeDraft: string;
  allowedSurface: "operator_drawer" | "lens_guide" | "internal_preview";
  publicSurfaceLocked: true;
  reviewed: false;
};

export type VlmBrainPass264DarkPatternCheck = {
  id: string;
  risk: VlmBrainPass264DarkPatternRisk;
  label: string;
  state: "blocked" | "review_required";
  reason: string;
  replacementRule: string;
  publicCopyAllowed: false;
};

export type VlmBrainPass264TrustNarrativeGuard = {
  schemaVersion: "vlm-brain-pass264-trust-narrative-guard-v1";
  mode: "operator_trust_narrative_guard";
  guardId: string;
  token: { symbol: string; name: string };
  operatorOnly: true;
  narrativeGuardActive: true;
  trustPsychologySafe: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releaseCutoverAllowed: false;
  releasePromotionAllowed: false;
  publicReadinessSealAllowed: false;
  finalVerdictAllowed: false;
  publicBadgeAllowed: false;
  urgencyCopyAllowed: false;
  certaintyCopyAllowed: false;
  accessShortcutAllowed: false;
  narrativeStageCount: number;
  darkPatternCheckCount: number;
  lockedSurfaceCount: number;
  proofGapCount: number;
  stages: VlmBrainPass264NarrativeStage[];
  darkPatternChecks: VlmBrainPass264DarkPatternCheck[];
  nextNarrativeMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS264_SCHEMA = "vlm-brain-pass264-trust-narrative-guard-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS264 trust narrative review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS264-TRUST-NARRATIVE", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stageFromLane(lane: VlmBrainPass263CandidateLane): VlmBrainPass264NarrativeStage {
  const stage: VlmBrainPass264NarrativeStageType = lane.state === "blocked"
    ? "surface_lock"
    : lane.state === "proof_gap"
      ? "evidence"
      : lane.state === "copy_review"
        ? "boundary"
        : lane.state === "operator_review"
          ? "operator_action"
          : "context";

  const customerSafeDraft = stage === "evidence"
    ? "Evidence is still under review, so the customer surface must show source context and missing-data limits only."
    : stage === "boundary"
      ? "Customer wording should explain the review boundary calmly and avoid urgency, certainty or public status language."
      : stage === "surface_lock"
        ? "This surface remains locked until reviewed proof, redaction and browser replay references are attached."
        : "Use a calm sequence: context first, evidence status second, manual review next and locked surfaces last.";

  return {
    id: stableId(`PASS264-NARRATIVE-STAGE-${lane.id}`),
    stage,
    label: compact(lane.label, "Trust narrative lane", 120),
    priority: lane.priority,
    sourceCueRef: lane.rehearsalLaneRef,
    operatorCopy: compact(
      `${lane.priority} ${lane.lane}: turn the trust question into context, evidence status, boundary and next operator action before any public wording is reconsidered.`,
      "Turn trust review into a calm operator narrative before public wording is reconsidered.",
      280,
    ),
    customerSafeDraft: compact(customerSafeDraft, "Customer-safe draft remains in review.", 260),
    allowedSurface: stage === "context" ? "lens_guide" : stage === "operator_action" ? "internal_preview" : "operator_drawer",
    publicSurfaceLocked: true,
    reviewed: false,
  };
}

function checkFromCue(cue: VlmBrainPass263TrustCue): VlmBrainPass264DarkPatternCheck {
  const risk: VlmBrainPass264DarkPatternRisk = cue.cue === "source_context"
    ? "certainty_overreach"
    : cue.cue === "missing_data_boundary"
      ? "hidden_missing_data"
      : cue.cue === "manual_review_boundary"
        ? "urgency_pressure"
        : "badge_theatre";

  const replacementRule = risk === "certainty_overreach"
    ? "Replace certainty with source confidence, freshness and reviewed evidence status."
    : risk === "hidden_missing_data"
      ? "Move missing evidence into the visible review boundary instead of smoothing it away."
      : risk === "urgency_pressure"
        ? "Replace pressure with manual review, next action and calm operator ownership."
        : "Replace public status language with an internal review note and locked surface state.";

  return {
    id: stableId(`PASS264-DARK-PATTERN-${cue.id}`),
    risk,
    label: compact(cue.label, "Trust cue check", 120),
    state: "review_required",
    reason: compact(cue.operatorNote, "Trust cue needs operator review before any customer copy.", 240),
    replacementRule: compact(replacementRule, "Use reviewed source context and a locked surface boundary.", 220),
    publicCopyAllowed: false,
  };
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function buildVlmBrainPass264TrustNarrativeGuard(
  board: VlmBrainPass263ReleaseCandidateTrustBoard,
): VlmBrainPass264TrustNarrativeGuard {
  const stages = sortByPriority(board.candidateLanes.map(stageFromLane));
  const darkPatternChecks = board.trustCues.map(checkFromCue);
  darkPatternChecks.push({
    id: stableId(`PASS264-DARK-PATTERN-ACCESS-${board.boardId}`),
    risk: "access_shortcut",
    label: "Access shortcut review",
    state: "blocked",
    reason: "Wallet/session access is a controlled future gate and cannot be used as a shortcut around reviewed source, redaction and storage proof.",
    replacementRule: "Describe controlled access as locked until entitlement, session and operator review are ready.",
    publicCopyAllowed: false,
  });
  const lockedSurfaceCount = board.surfaceLockCount + stages.filter((stage) => stage.publicSurfaceLocked).length;
  const top = stages.find((stage) => stage.stage === "surface_lock")
    ?? stages.find((stage) => stage.stage === "evidence")
    ?? stages.find((stage) => stage.stage === "boundary")
    ?? stages[0];

  return {
    schemaVersion: PASS264_SCHEMA,
    mode: "operator_trust_narrative_guard",
    guardId: stableId(`VLM-PASS264-TRUST-NARRATIVE-${board.token.symbol}-${board.boardId}`),
    token: board.token,
    operatorOnly: true,
    narrativeGuardActive: true,
    trustPsychologySafe: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releaseCutoverAllowed: false,
    releasePromotionAllowed: false,
    publicReadinessSealAllowed: false,
    finalVerdictAllowed: false,
    publicBadgeAllowed: false,
    urgencyCopyAllowed: false,
    certaintyCopyAllowed: false,
    accessShortcutAllowed: false,
    narrativeStageCount: stages.length,
    darkPatternCheckCount: darkPatternChecks.length,
    lockedSurfaceCount,
    proofGapCount: board.proofGapCount,
    stages,
    darkPatternChecks,
    nextNarrativeMove: compact(
      top
        ? `${top.priority} ${top.stage}: ${top.operatorCopy}`
        : "Build context, evidence status, boundary and next action before any public wording is reconsidered.",
      "Build the trust narrative sequence before public wording is reconsidered.",
      300,
    ),
    operatorSummary: compact(
      "PASS264 converts the candidate trust board into an operator-only trust narrative guard. It blocks urgency, certainty theatre, public badge language, hidden missing data and access shortcuts while shaping calm source-first copy for review.",
      "PASS264 trust narrative guard is operator-only.",
      360,
    ),
    customerBoundary: "Customer-facing export, report download, wallet/session access, public badges, release promotion and final verdict language remain locked while PASS264 trust narrative stages and dark-pattern checks are reviewed.",
  };
}

export function summarizeVlmBrainPass264TrustNarrativeGuard(board: VlmBrainPass263ReleaseCandidateTrustBoard) {
  const guard = buildVlmBrainPass264TrustNarrativeGuard(board);
  return {
    schemaVersion: guard.schemaVersion,
    guardId: guard.guardId,
    operatorOnly: guard.operatorOnly,
    narrativeStageCount: guard.narrativeStageCount,
    darkPatternCheckCount: guard.darkPatternCheckCount,
    lockedSurfaceCount: guard.lockedSurfaceCount,
    proofGapCount: guard.proofGapCount,
    nextNarrativeMove: guard.nextNarrativeMove,
    customerBoundary: guard.customerBoundary,
  };
}

export const PASS264_VLM_BRAIN_TRUST_NARRATIVE_GUARD_CONTRACT = true;
