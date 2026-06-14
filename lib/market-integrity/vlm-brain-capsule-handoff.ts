import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainReportCapsuleEnvelope } from "./vlm-brain-report-capsule";

export type VlmBrainCapsuleFreshnessState = "fresh" | "aging" | "stale" | "unknown";
export type VlmBrainCapsuleHandoffStatus = "blocked" | "review" | "ready_for_internal_preview";

export type VlmBrainCapsuleHandoff = {
  schemaVersion: "vlm-brain-capsule-handoff-v1-pass210";
  handoffMode: "report_bridge_preview";
  handoffId: string;
  createdAt: string;
  capsuleId: string;
  token: {
    symbol: string;
    name: string;
  };
  freshness: {
    state: VlmBrainCapsuleFreshnessState;
    sourceMode: TokenRiskResult["dataQuality"] | string;
    referenceAt: string;
    ageMinutes: number | null;
    staleAfterMinutes: number;
    label: string;
  };
  reportBridge: {
    status: VlmBrainCapsuleHandoffStatus;
    target: "shield_report_preview";
    pdfMode: "not_generated";
    storageMode: "client_preview_only";
    roleGate: "operator_review_required";
  };
  blockedBy: string[];
  safeNextActions: string[];
  redactionBoundary: string;
  copyBoundary: string;
};

function compact(value: unknown, fallback = "review required", limit = 260) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-HANDOFF", 140)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ageMinutes(referenceAt: string, nowIso: string) {
  const referenceMs = Date.parse(referenceAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(referenceMs) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.round((nowMs - referenceMs) / 60000));
}

function freshnessState(sourceMode: TokenRiskResult["dataQuality"], age: number | null): VlmBrainCapsuleFreshnessState {
  if (age === null) return "unknown";
  if (sourceMode === "demo") return "unknown";
  if (sourceMode === "partial") return age <= 20 ? "aging" : "stale";
  if (age <= 8) return "fresh";
  if (age <= 20) return "aging";
  return "stale";
}

function freshnessLabel(state: VlmBrainCapsuleFreshnessState, age: number | null, sourceMode: string) {
  const ageText = age === null ? "unknown age" : `${age} min`;
  if (state === "fresh") return `fresh source · ${ageText}`;
  if (state === "aging") return `review freshness · ${ageText}`;
  if (state === "stale") return `stale source · ${ageText}`;
  return `unknown freshness · ${sourceMode}`;
}

function buildBlockers(capsule: VlmBrainReportCapsuleEnvelope, result: TokenRiskResult, state: VlmBrainCapsuleFreshnessState) {
  const blockers = new Set<string>();
  if (capsule.exportReadiness === "blocked") blockers.add("capsule export is blocked by source/data boundary");
  if (capsule.exportReadiness === "review") blockers.add("capsule requires operator review before any report handoff");
  if (state === "stale") blockers.add("source freshness is stale; refresh before report preview");
  if (state === "unknown") blockers.add("source freshness is unknown; keep internal until verified");
  if (result.dataQuality !== "live") blockers.add("token read is not fully live; second source required");
  if ((result.metaModel?.limitations ?? []).length > 0) blockers.add("meta-model limitations remain open");
  if ((result.signals ?? []).some((signal) => signal.id === "insufficient_data")) blockers.add("insufficient-data signal is still active");
  return Array.from(blockers).slice(0, 8);
}

function handoffStatus(blockedBy: string[], capsule: VlmBrainReportCapsuleEnvelope): VlmBrainCapsuleHandoffStatus {
  if (blockedBy.length > 0) return "blocked";
  if (capsule.exportReadiness !== "ready") return "review";
  return "ready_for_internal_preview";
}

export function buildVlmBrainCapsuleHandoff(
  capsule: VlmBrainReportCapsuleEnvelope,
  result: TokenRiskResult,
  nowIso = new Date().toISOString(),
): VlmBrainCapsuleHandoff {
  const referenceAt = capsule.generatedAt || result.generatedAt || nowIso;
  const age = ageMinutes(referenceAt, nowIso);
  const state = freshnessState(result.dataQuality, age);
  const blockedBy = buildBlockers(capsule, result, state);
  const status = handoffStatus(blockedBy, capsule);

  return {
    schemaVersion: "vlm-brain-capsule-handoff-v1-pass210",
    handoffMode: "report_bridge_preview",
    handoffId: stableId(`VLM-BRAIN-HANDOFF-${capsule.capsuleId}-${status}`),
    createdAt: nowIso,
    capsuleId: capsule.capsuleId,
    token: capsule.token,
    freshness: {
      state,
      sourceMode: result.dataQuality,
      referenceAt,
      ageMinutes: age,
      staleAfterMinutes: result.dataQuality === "live" ? 20 : 8,
      label: freshnessLabel(state, age, result.dataQuality),
    },
    reportBridge: {
      status,
      target: "shield_report_preview",
      pdfMode: "not_generated",
      storageMode: "client_preview_only",
      roleGate: "operator_review_required",
    },
    blockedBy,
    safeNextActions: [
      "refresh live source before public report preview",
      "compare with a second independent source",
      "keep customer-facing copy in anomaly/review/missing-data language",
      "send only redacted summary into the future report route",
    ],
    redactionBoundary: "No raw payloads, PII, secrets, private weights or long identifiers are exported from this tile preview.",
    copyBoundary: "This is an internal handoff preview, not a final verdict, not a safety certificate and not financial advice.",
  };
}

export function serializeVlmBrainCapsuleHandoff(handoff: VlmBrainCapsuleHandoff) {
  return JSON.stringify(handoff, null, 2);
}

export const PASS210_VLM_BRAIN_CAPSULE_HANDOFF_CONTRACT = true;
