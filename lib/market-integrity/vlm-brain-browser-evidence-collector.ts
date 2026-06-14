import type { VlmBrainBrowserReplayScript } from "./vlm-brain-browser-replay-script";
import type { VlmBrainQaTraceBundle } from "./vlm-brain-qa-trace-bundle";
import type { VlmBrainRendererComparisonPlan } from "./vlm-brain-renderer-comparison-plan";

export type VlmBrainBrowserEvidenceItem = {
  id: string;
  label: string;
  traceTarget: "screenshot" | "fps_sample" | "network_log" | "keyboard_trace" | "route_response";
  requiredArtifact: string;
  state: "missing" | "required" | "review";
  passCondition: string;
  failCondition: string;
};

export type VlmBrainBrowserEvidenceCollector = {
  schemaVersion: "vlm-brain-browser-evidence-collector-v1-pass247";
  collectorMode: "manual_trace_bundle_required";
  collectorId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  collectorDecision: "blocked_missing_trace" | "review_required";
  qaHudRequired: true;
  webglComparisonAllowed: boolean;
  evidenceReady: false;
  missingArtifactCount: number;
  reviewArtifactCount: number;
  items: VlmBrainBrowserEvidenceItem[];
  operatorSummary: string;
  customerBoundary: string;
};

const SCHEMA = "vlm-brain-browser-evidence-collector-v1-pass247" as const;
function compact(value: unknown, fallback = "browser evidence required", limit = 300) { return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit) || fallback; }
function stableId(value: string) { return compact(value, "VLM-BROWSER-EVIDENCE", 260).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

export function buildVlmBrainBrowserEvidenceCollector(
  replay: VlmBrainBrowserReplayScript,
  qaTrace: VlmBrainQaTraceBundle,
  renderer: VlmBrainRendererComparisonPlan,
): VlmBrainBrowserEvidenceCollector {
  const createdAt = replay.createdAt ?? qaTrace.createdAt ?? renderer.createdAt ?? new Date().toISOString();
  const items = replay.steps.map((step) => ({
    id: `trace_${step.id}`,
    label: step.label,
    traceTarget: step.traceTarget,
    requiredArtifact: step.traceTarget === "fps_sample" ? "FPS sample with device/browser note and motion mode" : step.traceTarget === "keyboard_trace" ? "Keyboard trace showing click, ESC and arrow navigation" : step.traceTarget === "route_response" ? "Route response and screenshot proving preview-only gate" : "Screenshot with visible layer/portal state",
    state: step.state === "blocked" ? "missing" as const : "required" as const,
    passCondition: step.expected,
    failCondition: step.blockerIf,
  }));
  const rendererItem: VlmBrainBrowserEvidenceItem = {
    id: "trace_renderer_comparison",
    label: "DOM Orbit vs WebGL comparison",
    traceTarget: "fps_sample",
    requiredArtifact: "Side-by-side FPS/latency sample with DOM fallback preserved",
    state: renderer.comparisonDecision === "blocked" ? "missing" : "review",
    passCondition: "WebGL remains behind feature gate unless it beats DOM Orbit without breaking tile interaction.",
    failCondition: "WebGL replaces clickable DOM cards without drawer/keyboard/source evidence parity.",
  };
  const allItems = [...items, rendererItem];
  const missingArtifactCount = allItems.filter((item) => item.state === "missing").length;
  const reviewArtifactCount = allItems.filter((item) => item.state === "review" || item.state === "required").length;
  return {
    schemaVersion: SCHEMA,
    collectorMode: "manual_trace_bundle_required",
    collectorId: stableId(`VLM-BROWSER-EVIDENCE-${replay.token.symbol}-${replay.replayId}-${createdAt}`),
    createdAt,
    token: replay.token,
    collectorDecision: missingArtifactCount > 0 ? "blocked_missing_trace" : "review_required",
    qaHudRequired: true,
    webglComparisonAllowed: replay.webglComparisonAllowed && renderer.comparisonDecision !== "blocked",
    evidenceReady: false,
    missingArtifactCount,
    reviewArtifactCount,
    items: allItems,
    operatorSummary: "PASS247 turns browser QA from a checklist into a trace artifact collector: every modal/orbit/tile/search/PDF/wallet/mobile behavior needs evidence before release.",
    customerBoundary: "Browser evidence is internal QA proof only and must not be shown as a customer security certificate.",
  };
}

export const PASS247_VLM_BRAIN_BROWSER_EVIDENCE_COLLECTOR_CONTRACT = true;
