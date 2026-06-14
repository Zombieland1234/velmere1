import type {
  VlmBrainPass264DarkPatternCheck,
  VlmBrainPass264NarrativeStage,
  VlmBrainPass264TrustNarrativeGuard,
} from "./vlm-brain-pass264-trust-narrative-guard";
import type { VlmBrainPass254HandoffPriority } from "./vlm-brain-release-cockpit-source-ledger-handoff";

export type VlmBrainPass265LanguageStepType =
  | "source_context"
  | "limitation_visible"
  | "manual_review"
  | "operator_next_step"
  | "locked_surface";

export type VlmBrainPass265ToneRisk =
  | "urgency"
  | "certainty"
  | "status_badge"
  | "missing_context"
  | "access_pressure";

export type VlmBrainPass265LanguageStep = {
  id: string;
  step: VlmBrainPass265LanguageStepType;
  priority: VlmBrainPass254HandoffPriority;
  sourceStageRef: string;
  label: string;
  operatorInstruction: string;
  customerSafeLine: string;
  cognitiveLoad: "low" | "medium";
  surface: "operator_drawer" | "lens_guide" | "internal_preview";
  reviewRequired: true;
  publicSurfaceLocked: true;
};

export type VlmBrainPass265ToneCheck = {
  id: string;
  risk: VlmBrainPass265ToneRisk;
  state: "blocked" | "review_required";
  label: string;
  sourceCheckRef: string;
  replacementPattern: string;
  customerCopyAllowed: false;
};

export type VlmBrainPass265EvidenceLanguageLedger = {
  schemaVersion: "vlm-brain-pass265-evidence-language-ledger-v1";
  mode: "operator_evidence_language_ledger";
  ledgerId: string;
  token: { symbol: string; name: string };
  operatorOnly: true;
  languageLedgerActive: true;
  consentBoundaryActive: true;
  cognitiveLoadGuardActive: true;
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
  languageStepCount: number;
  toneCheckCount: number;
  lockedSurfaceCount: number;
  proofGapCount: number;
  languageSteps: VlmBrainPass265LanguageStep[];
  toneChecks: VlmBrainPass265ToneCheck[];
  recommendedReadingOrder: VlmBrainPass265LanguageStepType[];
  nextLanguageMove: string;
  operatorSummary: string;
  customerBoundary: string;
};

const PASS265_SCHEMA = "vlm-brain-pass265-evidence-language-ledger-v1" as const;
const PRIORITY_ORDER: Record<VlmBrainPass254HandoffPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const READING_ORDER: VlmBrainPass265LanguageStepType[] = [
  "source_context",
  "limitation_visible",
  "manual_review",
  "operator_next_step",
  "locked_surface",
];

function compact(value: unknown, fallback = "PASS265 language review required", limit = 320) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-PASS265-EVIDENCE-LANGUAGE", 280)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function languageStepFromStage(stage: VlmBrainPass264NarrativeStage): VlmBrainPass265LanguageStep {
  const step: VlmBrainPass265LanguageStepType = stage.stage === "context"
    ? "source_context"
    : stage.stage === "evidence"
      ? "limitation_visible"
      : stage.stage === "boundary"
        ? "manual_review"
        : stage.stage === "operator_action"
          ? "operator_next_step"
          : "locked_surface";

  const customerSafeLine = step === "source_context"
    ? "This review starts with source context and shows what is known before any conclusion is considered."
    : step === "limitation_visible"
      ? "Some evidence is incomplete, so the visible boundary must explain what still requires review."
      : step === "manual_review"
        ? "The result stays in manual review; the wording should describe the review boundary, not a final status."
        : step === "operator_next_step"
          ? "The next operator step is shown so the reader understands what is being checked next."
          : "This public surface remains locked until reviewed source, redaction, browser and storage proof exists.";

  return {
    id: stableId(`PASS265-LANGUAGE-STEP-${stage.id}`),
    step,
    priority: stage.priority,
    sourceStageRef: stage.id,
    label: compact(stage.label, "Evidence language step", 120),
    operatorInstruction: compact(
      `${stage.priority} ${step}: rewrite the lane into source context, visible limitation, manual review boundary and a clear next operator step before any customer copy is reconsidered.`,
      "Rewrite the lane into a calm evidence-first language step.",
      300,
    ),
    customerSafeLine: compact(customerSafeLine, "Customer-safe line remains under review.", 260),
    cognitiveLoad: step === "source_context" || step === "operator_next_step" ? "low" : "medium",
    surface: stage.allowedSurface,
    reviewRequired: true,
    publicSurfaceLocked: true,
  };
}

function toneRiskFromDarkPattern(check: VlmBrainPass264DarkPatternCheck): VlmBrainPass265ToneRisk {
  if (check.risk === "urgency_pressure") return "urgency";
  if (check.risk === "certainty_overreach") return "certainty";
  if (check.risk === "hidden_missing_data") return "missing_context";
  if (check.risk === "access_shortcut") return "access_pressure";
  return "status_badge";
}

function toneCheckFromDarkPattern(check: VlmBrainPass264DarkPatternCheck): VlmBrainPass265ToneCheck {
  const risk = toneRiskFromDarkPattern(check);
  const replacementPattern = risk === "urgency"
    ? "Use review order, owner and next action instead of pressure language."
    : risk === "certainty"
      ? "Use source confidence, freshness and missing-data boundary instead of absolute certainty."
      : risk === "missing_context"
        ? "Keep limitations visible and attach the evidence lane that still needs review."
        : risk === "access_pressure"
          ? "Keep access wording separate from evidence review and entitlement checks."
          : "Keep status language internal until reviewed proof exists.";

  return {
    id: stableId(`PASS265-TONE-CHECK-${check.id}`),
    risk,
    state: check.state === "blocked" ? "blocked" : "review_required",
    label: compact(check.label, "Tone check", 120),
    sourceCheckRef: check.id,
    replacementPattern: compact(replacementPattern, "Replace persuasion risk with evidence-first copy.", 220),
    customerCopyAllowed: false,
  };
}

function sortLanguageSteps(items: VlmBrainPass265LanguageStep[]): VlmBrainPass265LanguageStep[] {
  return [...items].sort((a, b) => {
    const priorityDelta = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return READING_ORDER.indexOf(a.step) - READING_ORDER.indexOf(b.step);
  });
}

export function buildVlmBrainPass265EvidenceLanguageLedger(
  guard: VlmBrainPass264TrustNarrativeGuard,
): VlmBrainPass265EvidenceLanguageLedger {
  const languageSteps = sortLanguageSteps(guard.stages.map(languageStepFromStage));
  const toneChecks = guard.darkPatternChecks.map(toneCheckFromDarkPattern);
  const lockedSurfaceCount = guard.lockedSurfaceCount + languageSteps.filter((step) => step.publicSurfaceLocked).length;
  const topStep = languageSteps.find((step) => step.step === "limitation_visible")
    ?? languageSteps.find((step) => step.step === "manual_review")
    ?? languageSteps.find((step) => step.step === "locked_surface")
    ?? languageSteps[0];

  return {
    schemaVersion: PASS265_SCHEMA,
    mode: "operator_evidence_language_ledger",
    ledgerId: stableId(`VLM-PASS265-EVIDENCE-LANGUAGE-${guard.token.symbol}-${guard.guardId}`),
    token: guard.token,
    operatorOnly: true,
    languageLedgerActive: true,
    consentBoundaryActive: true,
    cognitiveLoadGuardActive: true,
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
    languageStepCount: languageSteps.length,
    toneCheckCount: toneChecks.length,
    lockedSurfaceCount,
    proofGapCount: guard.proofGapCount,
    languageSteps,
    toneChecks,
    recommendedReadingOrder: READING_ORDER,
    nextLanguageMove: compact(
      topStep
        ? `${topStep.priority} ${topStep.step}: ${topStep.operatorInstruction}`
        : "Build the evidence language ledger before any customer-facing copy is reconsidered.",
      "Build the PASS265 evidence language ledger before customer copy is reconsidered.",
      320,
    ),
    operatorSummary: compact(
      "PASS265 converts the trust narrative guard into an evidence language ledger. It lowers cognitive load by forcing source context, visible limitations, manual review boundary, next operator step and locked surface state before customer wording is reconsidered.",
      "PASS265 evidence language ledger is operator-only.",
      360,
    ),
    customerBoundary: "Customer-facing export, report download, wallet/session access, public status badges, release promotion and final verdict language remain locked while PASS265 language steps and tone checks are reviewed.",
  };
}

export function summarizeVlmBrainPass265EvidenceLanguageLedger(guard: VlmBrainPass264TrustNarrativeGuard) {
  const ledger = buildVlmBrainPass265EvidenceLanguageLedger(guard);
  return {
    schemaVersion: ledger.schemaVersion,
    ledgerId: ledger.ledgerId,
    operatorOnly: ledger.operatorOnly,
    languageStepCount: ledger.languageStepCount,
    toneCheckCount: ledger.toneCheckCount,
    lockedSurfaceCount: ledger.lockedSurfaceCount,
    proofGapCount: ledger.proofGapCount,
    nextLanguageMove: ledger.nextLanguageMove,
    customerBoundary: ledger.customerBoundary,
  };
}

export const PASS265_VLM_BRAIN_EVIDENCE_LANGUAGE_LEDGER_CONTRACT = true;
