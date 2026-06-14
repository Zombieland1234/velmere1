import type { VlmBrainBrowserQaRunbook } from "./vlm-brain-browser-qa-runbook";
import type { VlmBrainLaunchReadinessDashboard } from "./vlm-brain-launch-readiness-dashboard";

export type VlmBrainQaTraceBundle = {
  schemaVersion: "vlm-brain-qa-trace-bundle-v1-pass233";
  traceMode: "operator_browser_trace_bundle_preview";
  traceBundleId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  traceDecision: "blocked" | "capture_required";
  browserTraceRequired: true;
  publicExportReady: false;
  rawPayloadAllowed: false;
  traces: Array<{ id: string; label: string; priority: "P0" | "P1" | "P2"; state: "blocked" | "required" | "review"; evidenceTarget: string; nextAction: string }>;
  operatorSummary: string;
  customerBoundary: string;
};
const SCHEMA = "vlm-brain-qa-trace-bundle-v1-pass233" as const;
function c(v: unknown, f = "QA trace review required", l = 260) { return String(v ?? f).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, l) || f; }
function id(v: string) { return c(v, "VLM-QA-TRACE", 230).toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
export function buildVlmBrainQaTraceBundle(dashboard: VlmBrainLaunchReadinessDashboard, runbook: VlmBrainBrowserQaRunbook): VlmBrainQaTraceBundle {
  const createdAt = runbook.createdAt ?? dashboard.createdAt ?? new Date().toISOString();
  const traces = runbook.steps.map((step) => ({ id: step.id, label: step.label, priority: step.priority, state: step.state === "blocked" ? "blocked" as const : step.state === "required" ? "required" as const : "review" as const, evidenceTarget: step.evidence, nextAction: step.nextAction }));
  const traceDecision = traces.some((t) => t.state === "blocked") || dashboard.launchDecision === "blocked" ? "blocked" : "capture_required";
  return { schemaVersion: SCHEMA, traceMode: "operator_browser_trace_bundle_preview", traceBundleId: id(`VLM-QA-TRACE-${dashboard.token.symbol}-${runbook.runbookId}-${createdAt}`), createdAt, token: dashboard.token, traceDecision, browserTraceRequired: true, publicExportReady: false, rawPayloadAllowed: false, traces, operatorSummary: "Browser trace bundle must be attached before renderer, PDF, customer copy or public route decisions.", customerBoundary: "QA trace bundle is internal release evidence only; it is not a public proof or investment instruction." };
}
export const PASS233_VLM_BRAIN_QA_TRACE_BUNDLE_CONTRACT = true;
