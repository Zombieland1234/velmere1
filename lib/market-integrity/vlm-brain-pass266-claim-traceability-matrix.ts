import type {
  VlmBrainPass265EvidenceLanguageLedger,
  VlmBrainPass265LanguageStep,
  VlmBrainPass265ToneCheck,
} from "./vlm-brain-pass265-evidence-language-ledger";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass266ClaimLaneType =
  | "source_claim"
  | "limitation_claim"
  | "review_claim"
  | "action_claim"
  | "surface_lock_claim";

export type VlmBrainPass266ComprehensionRisk =
  | "ambiguous_source"
  | "hidden_limit"
  | "review_blur"
  | "missing_next_step"
  | "surface_confusion";

export type VlmBrainPass266ClaimLane = {
  id: string;
  lane: VlmBrainPass266ClaimLaneType;
  priority: VlmBrainPass254HandoffPriority;
  sourceLanguageStepRef: string;
  evidenceAnchor: string;
  allowedWording: string;
  blockedShortcut: string;
  operatorQuestion: string;
  comprehensionLoad: "low" | "medium";
  publicClaimAllowed: false;
  customerSurfaceLocked: true;
};

export type VlmBrainPass266ComprehensionCheck = {
  id: string;
  risk: VlmBrainPass266ComprehensionRisk;
  sourceToneCheckRef: string;
  label: string;
  operatorFix: string;
  customerCopyAllowed: false;
};

export type VlmBrainPass266ClaimTraceabilityMatrix = {
  schemaVersion: "vlm-brain-pass266-claim-traceability-matrix-v1";
  mode: "operator_claim_traceability_matrix";
  matrixId: string;
  token: { symbol: string; name: string };
  operatorOnly: true;
  claimTraceabilityMatrixActive: true;
  comprehensionGateActive: true;
  evidenceAnchorRequired: true;
  publicExportAllowed: false;
  rawPayloadAllowed: false;
  binaryPdfAllowed: false;
  walletAccessAllowed: false;
  customerCopyAllowed: false;
  publicClaimAllowed: false;
  unmappedClaimAllowed: false;
  releaseCutoverAllowed: false;
  releasePromotionAllowed: false;
  publicReadinessSealAllowed: false;
  finalVerdictAllowed: false;
  publicBadgeAllowed: false;
  urgencyCopyAllowed: false;
  certaintyCopyAllowed: false;
  accessShortcutAllowed: false;
  languagePreviewOnly: true;
  claimLaneCount: number;
  comprehensionCheckCount: number;
  lockedClaimCount: number;
  proofGapCount: number;
  claimLanes: VlmBrainPass266ClaimLane[];
  comprehensionChecks: VlmBrainPass266ComprehensionCheck[];
  claimReadingProtocol: VlmBrainPass266ClaimLaneType[];
  nextTraceabilityMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS266_SCHEMA = "vlm-brain-pass266-claim-traceability-matrix-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const CLAIM_READING_PROTOCOL: VlmBrainPass266ClaimLaneType[] = [
  "source_claim",
  "limitation_claim",
  "review_claim",
  "action_claim",
  "surface_lock_claim",
];

function compact(value: unknown, fallback = "PASS266 traceability review required", limit = 340) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS266-CLAIM-TRACEABILITY", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function claimLaneFromLanguageStep(step: VlmBrainPass265LanguageStep): VlmBrainPass266ClaimLane {
  const lane: VlmBrainPass266ClaimLaneType = step.step === "source_context"
    ? "source_claim"
    : step.step === "limitation_visible"
      ? "limitation_claim"
      : step.step === "manual_review"
        ? "review_claim"
        : step.step === "operator_next_step"
          ? "action_claim"
          : "surface_lock_claim";

  const evidenceAnchor = lane === "source_claim"
    ? `source-context:${step.sourceStageRef}`
    : lane === "limitation_claim"
      ? `visible-limit:${step.sourceStageRef}`
      : lane === "review_claim"
        ? `manual-review:${step.sourceStageRef}`
        : lane === "action_claim"
          ? `next-action:${step.sourceStageRef}`
          : `surface-lock:${step.sourceStageRef}`;

  const allowedWording = lane === "source_claim"
    ? "Name the source context before any conclusion is suggested."
    : lane === "limitation_claim"
      ? "Show the limitation beside the evidence instead of smoothing it away."
      : lane === "review_claim"
        ? "Say the result remains under manual review and avoid final status language."
        : lane === "action_claim"
          ? "Show the next operator action in plain language."
          : "Keep the surface locked until reviewed proof, redaction and browser evidence exist.";

  const blockedShortcut = lane === "source_claim"
    ? "Do not let a source label become a public trust claim."
    : lane === "limitation_claim"
      ? "Do not hide missing data behind premium language."
      : lane === "review_claim"
        ? "Do not turn manual review into a final verdict."
        : lane === "action_claim"
          ? "Do not skip the operator task and jump to customer copy."
          : "Do not unlock PDF, wallet, public badge or customer copy from a language preview.";

  return {
    id: stableId(`PASS266-CLAIM-LANE-${step.id}`),
    lane,
    priority: step.priority,
    sourceLanguageStepRef: step.id,
    evidenceAnchor,
    allowedWording: compact(allowedWording, "Claim wording remains in operator review.", 220),
    blockedShortcut: compact(blockedShortcut, "Shortcut remains blocked.", 220),
    operatorQuestion: compact(
      `${step.priority} ${lane}: can the operator point to the exact evidence anchor and explain the limitation before this wording is shown anywhere outside review?`,
      "Can the operator point to a reviewed evidence anchor before this wording moves forward?",
      300,
    ),
    comprehensionLoad: step.cognitiveLoad,
    publicClaimAllowed: false,
    customerSurfaceLocked: true,
  };
}

function riskFromToneCheck(check: VlmBrainPass265ToneCheck): VlmBrainPass266ComprehensionRisk {
  if (check.risk === "certainty") return "review_blur";
  if (check.risk === "missing_context") return "hidden_limit";
  if (check.risk === "access_pressure") return "surface_confusion";
  if (check.risk === "urgency") return "missing_next_step";
  return "ambiguous_source";
}

function comprehensionCheckFromToneCheck(check: VlmBrainPass265ToneCheck): VlmBrainPass266ComprehensionCheck {
  const risk = riskFromToneCheck(check);
  const operatorFix = risk === "ambiguous_source"
    ? "Attach a source-context anchor and remove badge-style trust language."
    : risk === "hidden_limit"
      ? "Move the limitation into the same visible line as the evidence status."
      : risk === "review_blur"
        ? "Replace certainty with manual-review status and source confidence wording."
        : risk === "missing_next_step"
          ? "Add the next operator action instead of urgency or pressure wording."
          : "Separate access/session wording from evidence claims and keep the surface locked.";

  return {
    id: stableId(`PASS266-COMPREHENSION-CHECK-${check.id}`),
    risk,
    sourceToneCheckRef: check.id,
    label: compact(check.label, "Comprehension check", 130),
    operatorFix: compact(operatorFix, "Rewrite for traceable evidence and lower cognitive load.", 240),
    customerCopyAllowed: false,
  };
}

function sortClaimLanes(items: VlmBrainPass266ClaimLane[]): VlmBrainPass266ClaimLane[] {
  return [...items].sort((a, b) => {
    const priorityDelta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return CLAIM_READING_PROTOCOL.indexOf(a.lane) - CLAIM_READING_PROTOCOL.indexOf(b.lane);
  });
}

export function buildVlmBrainPass266ClaimTraceabilityMatrix(
  ledger: VlmBrainPass265EvidenceLanguageLedger,
): VlmBrainPass266ClaimTraceabilityMatrix {
  const claimLanes = sortClaimLanes(ledger.languageSteps.map(claimLaneFromLanguageStep));
  const comprehensionChecks = ledger.toneChecks.map(comprehensionCheckFromToneCheck);
  const lockedClaimCount = claimLanes.filter((lane) => lane.customerSurfaceLocked).length;
  const proofGapCount = ledger.proofGapCount + comprehensionChecks.length;

  return {
    schemaVersion: PASS266_SCHEMA,
    mode: "operator_claim_traceability_matrix",
    matrixId: stableId(`VLM-PASS266-CLAIM-TRACEABILITY-${ledger.token.symbol}-${ledger.ledgerId}`),
    token: ledger.token,
    operatorOnly: true,
    claimTraceabilityMatrixActive: true,
    comprehensionGateActive: true,
    evidenceAnchorRequired: true,
    publicExportAllowed: false,
    rawPayloadAllowed: false,
    binaryPdfAllowed: false,
    walletAccessAllowed: false,
    customerCopyAllowed: false,
    publicClaimAllowed: false,
    unmappedClaimAllowed: false,
    releaseCutoverAllowed: false,
    releasePromotionAllowed: false,
    publicReadinessSealAllowed: false,
    finalVerdictAllowed: false,
    publicBadgeAllowed: false,
    urgencyCopyAllowed: false,
    certaintyCopyAllowed: false,
    accessShortcutAllowed: false,
    languagePreviewOnly: true,
    claimLaneCount: claimLanes.length,
    comprehensionCheckCount: comprehensionChecks.length,
    lockedClaimCount,
    proofGapCount,
    claimLanes,
    comprehensionChecks,
    claimReadingProtocol: CLAIM_READING_PROTOCOL,
    nextTraceabilityMove: claimLanes[0]
      ? `Attach reviewed evidence anchors to ${claimLanes[0].priority} ${claimLanes[0].lane} before any public-facing wording is reconsidered.`
      : "Build the PASS266 claim traceability matrix before public-facing wording is reconsidered.",
    operatorSummary: compact(
      `PASS266 maps each evidence-language step into a traceable claim lane with an evidence anchor, a blocked shortcut and a comprehension check. Public export, customer copy, wallet/session, PDF download and release promotion remain locked.`,
      "PASS266 keeps every claim traceable to evidence before any public surface is reconsidered.",
      360,
    ),
    customerBoundary: "Customer-facing wording, public claims, public badges, report download, wallet/session access and release promotion remain locked while PASS266 claim lanes and comprehension checks are reviewed.",
  };
}

export const PASS266_VLM_BRAIN_CLAIM_TRACEABILITY_MATRIX_CONTRACT = true;
