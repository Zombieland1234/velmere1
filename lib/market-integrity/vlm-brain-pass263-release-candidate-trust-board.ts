import type {
  VlmBrainPass262ReleaseRehearsalMatrix,
  VlmBrainPass262RehearsalLane,
  VlmBrainPass262SurfaceLock,
} from "./vlm-brain-pass262-release-rehearsal-matrix";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass263CandidateState =
  | "blocked"
  | "proof_gap"
  | "copy_review"
  | "operator_review"
  | "surface_locked";

export type VlmBrainPass263TrustCueType =
  | "source_context"
  | "missing_data_boundary"
  | "manual_review_boundary"
  | "operator_only_boundary";

export type VlmBrainPass263CandidateLane = {
  id: string;
  rehearsalLaneRef: string;
  lane: VlmBrainPass262RehearsalLane["lane"];
  label: string;
  owner: VlmBrainPass262RehearsalLane["owner"];
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass263CandidateState;
  trustQuestion: string;
  customerSafeAngle: string;
  operatorNextAction: string;
  publicSurfaceLocked: true;
  releaseAllowed: false;
};

export type VlmBrainPass263TrustCue = {
  id: string;
  cue: VlmBrainPass263TrustCueType;
  label: string;
  customerSafeCopy: string;
  operatorNote: string;
  publicReady: false;
};

export type VlmBrainPass263ReleaseCandidateTrustBoard = {
  schemaVersion: "vlm-brain-pass263-release-candidate-trust-board-v1";
  mode: "operator_release_candidate_trust_board";
  boardId: string;
  token: { symbol: string; name: string };
  decision: "candidate_blocked" | "proof_gap_review" | "copy_review_required" | "operator_review_required";
  candidateBoardActive: true;
  operatorOnly: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releaseCutoverAllowed: false;
  releasePromotionAllowed: false;
  publicReadinessSealAllowed: false;
  finalVerdictAllowed: false;
  trustCuePublicReady: false;
  copyPsychologySafe: true;
  laneCount: number;
  blockedLaneCount: number;
  proofGapCount: number;
  copyReviewCount: number;
  trustCueCount: number;
  surfaceLockCount: number;
  candidateLanes: VlmBrainPass263CandidateLane[];
  trustCues: VlmBrainPass263TrustCue[];
  surfaceLocks: VlmBrainPass262SurfaceLock[];
  nextCandidateMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS263_SCHEMA = "vlm-brain-pass263-release-candidate-trust-board-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS263 release candidate review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS263-RELEASE-CANDIDATE", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function candidateState(lane: VlmBrainPass262RehearsalLane): VlmBrainPass263CandidateState {
  if (lane.state === "blocked") return "blocked";
  if (lane.state === "evidence_missing") return "proof_gap";
  if (lane.state === "rollback_drill_required") return "surface_locked";
  if (lane.state === "owner_review") return "operator_review";
  return "copy_review";
}

function trustQuestion(lane: VlmBrainPass262RehearsalLane) {
  if (lane.lane === "source") return "Can an operator explain the source status, freshness and missing evidence without turning it into a final public verdict?";
  if (lane.lane === "browser") return "Can the replay evidence be shown internally without implying that every device path has passed?";
  if (lane.lane === "redaction") return "Can the customer-facing wording stay useful while keeping raw fields and internal notes out of the surface?";
  if (lane.lane === "wallet") return "Can access language describe a controlled session boundary without asking for sensitive wallet material?";
  if (lane.lane === "pdf") return "Can the report surface remain preview-only until storage, redaction and browser proof are reviewed?";
  if (lane.lane === "customer_copy") return "Can the copy create confidence through clarity instead of urgency, hype or release pressure?";
  return "Can this lane earn trust through clear limits, reviewed proof and operator ownership?";
}

function customerSafeAngle(lane: VlmBrainPass262RehearsalLane) {
  if (lane.lane === "source") return "Show source confidence, freshness and missing-data boundaries in one calm sentence.";
  if (lane.lane === "browser") return "Mention that browser replay is still under operator review instead of presenting launch readiness.";
  if (lane.lane === "redaction") return "State that customer copy is redacted and reviewed, not a raw evidence dump.";
  if (lane.lane === "wallet") return "Frame wallet/session as controlled access only, not a public onboarding shortcut.";
  if (lane.lane === "pdf") return "Call the report a preview until evidence, storage and redaction are reviewed.";
  if (lane.lane === "customer_copy") return "Use anomaly, source confidence, missing data and manual review language.";
  return "Keep the lane operator-only and clear about what is still missing.";
}

function operatorNextAction(lane: VlmBrainPass262RehearsalLane) {
  return compact(
    `${lane.priority} ${lane.lane}: answer the trust question, attach reviewed proof and keep public surfaces locked before candidate review continues.`,
    "Attach reviewed proof and keep public surfaces locked before candidate review.",
    260,
  );
}

function laneFromRehearsal(lane: VlmBrainPass262RehearsalLane): VlmBrainPass263CandidateLane {
  return {
    id: stableId(`PASS263-CANDIDATE-LANE-${lane.id}`),
    rehearsalLaneRef: lane.id,
    lane: lane.lane,
    label: compact(lane.label, "Release candidate lane", 120),
    owner: lane.owner,
    priority: lane.priority,
    state: candidateState(lane),
    trustQuestion: compact(trustQuestion(lane), "Trust review question required.", 260),
    customerSafeAngle: compact(customerSafeAngle(lane), "Customer-safe angle required.", 220),
    operatorNextAction: operatorNextAction(lane),
    publicSurfaceLocked: true,
    releaseAllowed: false,
  };
}

function buildTrustCues(matrix: VlmBrainPass262ReleaseRehearsalMatrix): VlmBrainPass263TrustCue[] {
  const base = [
    [
      "source_context",
      "Source context over certainty",
      "Use source confidence, freshness and missing-data boundaries before any customer summary.",
      `Source lanes still need review: ${matrix.evidenceMissingCount} evidence gaps and ${matrix.blockedLaneCount} blocked lanes.`,
    ],
    [
      "missing_data_boundary",
      "Missing data increases review pressure",
      "Say that missing evidence requires review; do not convert absence of data into a clean release message.",
      "Candidate board keeps missing-data pressure visible before customer copy is reconsidered.",
    ],
    [
      "manual_review_boundary",
      "Manual review before release language",
      "Keep wording calm: anomaly, source confidence, reviewed proof and next operator action.",
      `Owner signoffs still required: ${matrix.ownerSignoffCount}.`,
    ],
    [
      "operator_only_boundary",
      "Operator-only candidate board",
      "This board is an internal release-candidate review surface, not a public badge or customer report.",
      `Surface locks active: ${matrix.surfaceLockCount}.`,
    ],
  ] as const;
  return base.map(([cue, label, customerSafeCopy, operatorNote]) => ({
    id: stableId(`PASS263-TRUST-CUE-${cue}-${matrix.matrixId}`),
    cue,
    label,
    customerSafeCopy,
    operatorNote,
    publicReady: false,
  }));
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function buildVlmBrainPass263ReleaseCandidateTrustBoard(
  matrix: VlmBrainPass262ReleaseRehearsalMatrix,
): VlmBrainPass263ReleaseCandidateTrustBoard {
  const candidateLanes = sortByPriority(matrix.lanes.map(laneFromRehearsal));
  const blockedLaneCount = candidateLanes.filter((lane) => lane.state === "blocked").length;
  const proofGapCount = candidateLanes.filter((lane) => lane.state === "proof_gap").length;
  const copyReviewCount = candidateLanes.filter((lane) => lane.state === "copy_review").length;
  const trustCues = buildTrustCues(matrix);
  const top = candidateLanes.find((lane) => lane.state === "blocked")
    ?? candidateLanes.find((lane) => lane.state === "proof_gap")
    ?? candidateLanes.find((lane) => lane.state === "surface_locked")
    ?? candidateLanes.find((lane) => lane.state === "copy_review")
    ?? candidateLanes[0];
  const decision = blockedLaneCount > 0
    ? "candidate_blocked"
    : proofGapCount > 0
      ? "proof_gap_review"
      : copyReviewCount > 0
        ? "copy_review_required"
        : "operator_review_required";

  return {
    schemaVersion: PASS263_SCHEMA,
    mode: "operator_release_candidate_trust_board",
    boardId: stableId(`VLM-PASS263-CANDIDATE-TRUST-${matrix.token.symbol}-${matrix.matrixId}`),
    token: matrix.token,
    decision,
    candidateBoardActive: true,
    operatorOnly: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releaseCutoverAllowed: false,
    releasePromotionAllowed: false,
    publicReadinessSealAllowed: false,
    finalVerdictAllowed: false,
    trustCuePublicReady: false,
    copyPsychologySafe: true,
    laneCount: candidateLanes.length,
    blockedLaneCount,
    proofGapCount,
    copyReviewCount,
    trustCueCount: trustCues.length,
    surfaceLockCount: matrix.surfaceLockCount,
    candidateLanes,
    trustCues,
    surfaceLocks: matrix.surfaceLocks,
    nextCandidateMove: compact(
      top
        ? `${top.priority} ${top.lane}: ${top.operatorNextAction}`
        : "Answer trust questions, attach reviewed proof and keep release surfaces locked before candidate review.",
      "Attach reviewed proof before candidate review.",
      280,
    ),
    operatorSummary: compact(
      "PASS263 turns the dry-run rehearsal into an operator-only release candidate trust board. It focuses on trust psychology, source clarity, customer-safe copy and locked public surfaces before any release decision is reconsidered.",
      "PASS263 release candidate trust board is operator-only.",
      340,
    ),
    customerBoundary: "Customer-facing export, report download, wallet/session access, public readiness seals and release promotion stay locked while PASS263 candidate trust cues are reviewed.",
  };
}

export function summarizeVlmBrainPass263ReleaseCandidateTrustBoard(matrix: VlmBrainPass262ReleaseRehearsalMatrix) {
  const board = buildVlmBrainPass263ReleaseCandidateTrustBoard(matrix);
  return {
    schemaVersion: board.schemaVersion,
    boardId: board.boardId,
    decision: board.decision,
    operatorOnly: board.operatorOnly,
    blockedLaneCount: board.blockedLaneCount,
    proofGapCount: board.proofGapCount,
    copyReviewCount: board.copyReviewCount,
    trustCueCount: board.trustCueCount,
    nextCandidateMove: board.nextCandidateMove,
    customerBoundary: board.customerBoundary,
  };
}

export const PASS263_VLM_BRAIN_RELEASE_CANDIDATE_TRUST_BOARD_CONTRACT = true;
