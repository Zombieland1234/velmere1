import type {
  VlmBrainPass261ControlLane,
  VlmBrainPass261ReleaseCutoverControl,
  VlmBrainPass261RollbackVaultItem,
} from "./vlm-brain-pass261-release-cutover-control";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass262RehearsalState =
  | "blocked"
  | "evidence_missing"
  | "owner_review"
  | "rollback_drill_required"
  | "dry_run_hold";

export type VlmBrainPass262RehearsalLane = {
  id: string;
  lane: VlmBrainPass261ControlLane["lane"];
  label: string;
  owner: VlmBrainPass261ControlLane["owner"];
  priority: VlmBrainPass254HandoffPriority;
  state: VlmBrainPass262RehearsalState;
  cutoverLaneRef: string;
  rehearsalStep: string;
  dryRunEvidence: string;
  rollbackDrill: string;
  publicSurfaceLocked: true;
  releaseAllowed: false;
};

export type VlmBrainPass262OwnerSignoff = {
  id: string;
  owner: VlmBrainPass262RehearsalLane["owner"];
  priority: VlmBrainPass254HandoffPriority;
  state: "missing" | "review_needed" | "rollback_needed";
  requiredEvidence: string;
  publicSealAllowed: false;
};

export type VlmBrainPass262SurfaceLock = {
  id: string;
  surface: "pdf" | "wallet" | "customer_copy" | "public_badge" | "raw_payload" | "release_cutover";
  label: string;
  state: "locked";
  reason: string;
  operatorAction: string;
  customerVisible: false;
};

export type VlmBrainPass262ReleaseRehearsalMatrix = {
  schemaVersion: "vlm-brain-pass262-release-rehearsal-matrix-v1";
  mode: "operator_release_rehearsal_matrix_dry_run";
  matrixId: string;
  token: { symbol: string; name: string };
  decision: "rehearsal_blocked" | "evidence_capture_required" | "rollback_drill_required" | "owner_review_required";
  releaseRehearsalActive: true;
  dryRunOnly: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  releaseCutoverAllowed: false;
  releasePromotionAllowed: false;
  publicReadinessSealAllowed: false;
  rehearsalPromotionAllowed: false;
  finalVerdictAllowed: false;
  rollbackDrillRequired: true;
  laneCount: number;
  blockedLaneCount: number;
  evidenceMissingCount: number;
  rollbackDrillCount: number;
  ownerSignoffCount: number;
  surfaceLockCount: number;
  lanes: VlmBrainPass262RehearsalLane[];
  ownerSignoffs: VlmBrainPass262OwnerSignoff[];
  surfaceLocks: VlmBrainPass262SurfaceLock[];
  nextRehearsalMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS262_SCHEMA = "vlm-brain-pass262-release-rehearsal-matrix-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(value: unknown, fallback = "PASS262 release rehearsal review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS262-RELEASE-REHEARSAL", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function rehearsalState(lane: VlmBrainPass261ControlLane): VlmBrainPass262RehearsalState {
  if (lane.state === "blocked") return "blocked";
  if (lane.state === "capture_required") return "evidence_missing";
  if (lane.state === "rollback_required") return "rollback_drill_required";
  if (lane.state === "review_required") return "owner_review";
  return "dry_run_hold";
}

function rehearsalStep(lane: VlmBrainPass261ControlLane) {
  if (lane.lane === "browser") return "Run same-session browser replay and attach trace notes before rehearsal review.";
  if (lane.lane === "storage") return "Confirm durable write preview, restore path and rollback note before rehearsal review.";
  if (lane.lane === "redaction") return "Review redacted fields and confirm no raw sensitive payload reaches customer copy.";
  if (lane.lane === "pdf") return "Keep report route preview-only and prove the fallback state before rehearsal review.";
  if (lane.lane === "wallet") return "Confirm controlled session boundary and entitlement proof before rehearsal review.";
  if (lane.lane === "customer_copy") return "Review customer wording for anomaly, source confidence, missing data and manual review language.";
  if (lane.lane === "source") return "Attach source snapshot, TTL note and reviewer note before rehearsal review.";
  return "Hold release-owner review until source, browser, storage and redaction lanes have evidence.";
}

function rollbackDrill(lane: VlmBrainPass261ControlLane) {
  return compact(
    `Dry-run rollback for ${lane.lane}: keep lane operator-only, preserve preview state and record the hold reason before any release rehearsal can continue.`,
    "Dry-run rollback keeps this lane operator-only until reviewed evidence exists.",
    260,
  );
}

function laneFromCutover(lane: VlmBrainPass261ControlLane): VlmBrainPass262RehearsalLane {
  return {
    id: stableId(`PASS262-REHEARSAL-LANE-${lane.id}`),
    lane: lane.lane,
    label: compact(lane.label, "Release rehearsal lane", 120),
    owner: lane.owner,
    priority: lane.priority,
    state: rehearsalState(lane),
    cutoverLaneRef: lane.id,
    rehearsalStep: compact(rehearsalStep(lane), "Operator rehearsal step required.", 260),
    dryRunEvidence: compact(lane.acceptance, "Dry-run evidence is required before release rehearsal.", 240),
    rollbackDrill: rollbackDrill(lane),
    publicSurfaceLocked: true,
    releaseAllowed: false,
  };
}

function signoffFromLane(lane: VlmBrainPass262RehearsalLane): VlmBrainPass262OwnerSignoff {
  return {
    id: stableId(`PASS262-SIGNOFF-${lane.owner}-${lane.lane}-${lane.id}`),
    owner: lane.owner,
    priority: lane.priority,
    state: lane.state === "evidence_missing" ? "missing" : lane.state === "rollback_drill_required" ? "rollback_needed" : "review_needed",
    requiredEvidence: compact(
      `${lane.label}: ${lane.dryRunEvidence}`,
      "Owner signoff requires reviewed dry-run evidence.",
      260,
    ),
    publicSealAllowed: false,
  };
}

function surfaceLocks(control: VlmBrainPass261ReleaseCutoverControl): VlmBrainPass262SurfaceLock[] {
  const base = [
    ["pdf", "Binary PDF remains disabled", "Report route stays preview-only until storage, redaction and browser rehearsal proof are reviewed."],
    ["wallet", "Wallet/session access remains controlled", "Access lane stays controlled until entitlement and session review are accepted."],
    ["customer_copy", "Customer copy remains review-only", "Customer text stays limited to anomaly, source confidence, missing data and manual review boundaries."],
    ["public_badge", "Public readiness badge remains hidden", "Private readiness seals cannot become public without owner signoff and reviewed proof."],
    ["raw_payload", "Raw payload export remains blocked", "Raw payloads stay operator-only and redacted before any report surface."],
    ["release_cutover", "Release cutover remains disabled", "Cutover remains blocked until dry-run rehearsal, rollback drill and owner signoff are recorded."],
  ] as const;
  return base.map(([surface, label, reason]) => ({
    id: stableId(`PASS262-SURFACE-LOCK-${surface}-${control.controlId}`),
    surface,
    label,
    state: "locked",
    reason,
    operatorAction: "Keep the surface locked, attach dry-run proof and review the rollback drill before promotion is reconsidered.",
    customerVisible: false,
  }));
}

function sortByPriority<T extends { priority: VlmBrainPass254HandoffPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function uniqueOwnerSignoffs(lanes: VlmBrainPass262RehearsalLane[]): VlmBrainPass262OwnerSignoff[] {
  const seen = new Set<string>();
  const signoffs: VlmBrainPass262OwnerSignoff[] = [];
  for (const lane of sortByPriority(lanes)) {
    const key = `${lane.owner}-${lane.lane}-${lane.priority}`;
    if (seen.has(key)) continue;
    seen.add(key);
    signoffs.push(signoffFromLane(lane));
  }
  return signoffs.slice(0, 10);
}

export function buildVlmBrainPass262ReleaseRehearsalMatrix(
  control: VlmBrainPass261ReleaseCutoverControl,
): VlmBrainPass262ReleaseRehearsalMatrix {
  const lanes = sortByPriority(control.lanes.map(laneFromCutover));
  const blockedLaneCount = lanes.filter((lane) => lane.state === "blocked").length;
  const evidenceMissingCount = lanes.filter((lane) => lane.state === "evidence_missing").length;
  const rollbackDrillCount = lanes.filter((lane) => lane.state === "rollback_drill_required").length;
  const ownerSignoffs = uniqueOwnerSignoffs(lanes);
  const locks = surfaceLocks(control);
  const top = lanes.find((lane) => lane.state === "blocked")
    ?? lanes.find((lane) => lane.state === "evidence_missing")
    ?? lanes.find((lane) => lane.state === "rollback_drill_required")
    ?? lanes.find((lane) => lane.state === "owner_review")
    ?? lanes[0];
  const decision = blockedLaneCount > 0
    ? "rehearsal_blocked"
    : evidenceMissingCount > 0
      ? "evidence_capture_required"
      : rollbackDrillCount > 0
        ? "rollback_drill_required"
        : "owner_review_required";

  return {
    schemaVersion: PASS262_SCHEMA,
    mode: "operator_release_rehearsal_matrix_dry_run",
    matrixId: stableId(`VLM-PASS262-REHEARSAL-MATRIX-${control.token.symbol}-${control.controlId}`),
    token: control.token,
    decision,
    releaseRehearsalActive: true,
    dryRunOnly: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    releaseCutoverAllowed: false,
    releasePromotionAllowed: false,
    publicReadinessSealAllowed: false,
    rehearsalPromotionAllowed: false,
    finalVerdictAllowed: false,
    rollbackDrillRequired: true,
    laneCount: lanes.length,
    blockedLaneCount,
    evidenceMissingCount,
    rollbackDrillCount,
    ownerSignoffCount: ownerSignoffs.length,
    surfaceLockCount: locks.length,
    lanes,
    ownerSignoffs,
    surfaceLocks: locks,
    nextRehearsalMove: compact(
      top
        ? `${top.priority} ${top.lane}: ${top.rehearsalStep}`
        : "Collect dry-run evidence, rollback drill notes and owner signoff before release rehearsal.",
      "Collect dry-run evidence before release rehearsal.",
      260,
    ),
    operatorSummary: compact(
      "PASS262 runs an operator-only release rehearsal matrix above cutover control. It requires dry-run evidence, rollback drills, owner signoff and surface locks before any release promotion is reconsidered.",
      "PASS262 release rehearsal matrix is operator-only and dry-run only.",
      320,
    ),
    customerBoundary: "Customer-facing export, report download, wallet/session access, public readiness seals and release cutover stay locked during PASS262 rehearsal.",
  };
}

export function summarizeVlmBrainPass262ReleaseRehearsalMatrix(control: VlmBrainPass261ReleaseCutoverControl) {
  const matrix = buildVlmBrainPass262ReleaseRehearsalMatrix(control);
  return {
    schemaVersion: matrix.schemaVersion,
    matrixId: matrix.matrixId,
    decision: matrix.decision,
    dryRunOnly: matrix.dryRunOnly,
    blockedLaneCount: matrix.blockedLaneCount,
    evidenceMissingCount: matrix.evidenceMissingCount,
    rollbackDrillCount: matrix.rollbackDrillCount,
    surfaceLockCount: matrix.surfaceLockCount,
    nextRehearsalMove: matrix.nextRehearsalMove,
    customerBoundary: matrix.customerBoundary,
  };
}

export const PASS262_VLM_BRAIN_RELEASE_REHEARSAL_MATRIX_CONTRACT = true;
