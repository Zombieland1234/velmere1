import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainQaTraceBundle } from "./vlm-brain-qa-trace-bundle";
import type { VlmBrainReleaseTriageBoard } from "./vlm-brain-release-triage-board";
import type { VlmBrainRendererComparisonPlan } from "./vlm-brain-renderer-comparison-plan";

export type VlmBrainBrowserReplayStep = {
  id: "modal" | "orbit" | "tile" | "search" | "pdf" | "wallet" | "mobile" | "reduced_motion";
  label: string;
  expected: string;
  blockerIf: string;
  traceTarget: "screenshot" | "fps_sample" | "network_log" | "keyboard_trace" | "route_response";
  state: "required" | "blocked" | "review";
};

export type VlmBrainBrowserReplayScript = {
  schemaVersion: "vlm-brain-browser-replay-script-v1-pass245";
  scriptMode: "manual_vercel_browser_replay_required";
  replayId: string;
  createdAt: string;
  token: { symbol: string; name: string };
  replayDecision: "blocked_until_run" | "review_required";
  qaHudRequired: true;
  webglComparisonAllowed: boolean;
  customerExportReady: false;
  binaryPdfReady: false;
  steps: VlmBrainBrowserReplayStep[];
  operatorSummary: string;
  nextMilestone: string;
};

const SCHEMA = "vlm-brain-browser-replay-script-v1-pass245" as const;

function compact(value: unknown, fallback = "browser replay required", limit = 300) {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit) || fallback;
}

function stableId(value: string) {
  return compact(value, "VLM-BROWSER-REPLAY", 260)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function step(input: VlmBrainBrowserReplayStep): VlmBrainBrowserReplayStep {
  return input;
}

export function buildVlmBrainBrowserReplayScript(
  triage: VlmBrainReleaseTriageBoard,
  renderer: VlmBrainRendererComparisonPlan,
  qaTrace: VlmBrainQaTraceBundle,
  result: TokenRiskResult,
): VlmBrainBrowserReplayScript {
  const createdAt = result.generatedAt ?? triage.createdAt ?? qaTrace.createdAt ?? new Date().toISOString();
  const webglComparisonAllowed = renderer.comparisonDecision !== "blocked" && qaTrace.traceDecision !== "blocked";
  const steps: VlmBrainBrowserReplayStep[] = [
    step({
      id: "modal",
      label: "Token modal layering",
      expected: "Chart, Basic/Pro/Advanced controls and VLM Brain portal stay above Shield Map without clipping.",
      blockerIf: "Dropdown, detail drawer or return-to-chart button hides below a parent panel.",
      traceTarget: "screenshot",
      state: "required",
    }),
    step({
      id: "orbit",
      label: "Orbit 360 FPS sample",
      expected: "Advanced Orbit runs with readable cards, paused motion while a tile detail is open and no public QA debug clutter.",
      blockerIf: "Motion drops below accepted device threshold or causes unreadable tile overlap.",
      traceTarget: "fps_sample",
      state: "required",
    }),
    step({
      id: "tile",
      label: "Tile keyboard/detail flow",
      expected: "Click, ESC and arrow navigation work; detail panel shows source confidence, decision dock and export gates.",
      blockerIf: "Detail panel cannot be closed, loses focus, or exposes raw/private data.",
      traceTarget: "keyboard_trace",
      state: "required",
    }),
    step({
      id: "search",
      label: "Shield search portal",
      expected: "Search suggestions render above panels with token glyphs and close on outside click.",
      blockerIf: "Suggestions clip under Shield Investigator or lose click selection after portal rendering.",
      traceTarget: "screenshot",
      state: "required",
    }),
    step({
      id: "pdf",
      label: "PDF preview route",
      expected: "Preview remains HTML/PDF-ready only and blocks binary download until storage/redaction are real.",
      blockerIf: "UI claims a final certificate, guaranteed safety, or exposes raw payload.",
      traceTarget: "route_response",
      state: triage.binaryPdfReady ? "review" : "blocked",
    }),
    step({
      id: "wallet",
      label: "Wallet/access gate",
      expected: "VLM access is framed as utility/intelligence access; no recovery phrase/private key flow exists.",
      blockerIf: "Any flow asks for recovery phrase/private key or implies ROI/price upside.",
      traceTarget: "screenshot",
      state: "blocked",
    }),
    step({
      id: "mobile",
      label: "Mobile downgrade",
      expected: "Reduced density, scroll lock and drawer layers remain usable on narrow screens.",
      blockerIf: "Orbit/detail/search/popup becomes clipped or too small to close.",
      traceTarget: "screenshot",
      state: "required",
    }),
    step({
      id: "reduced_motion",
      label: "Reduced motion",
      expected: "Reduced-motion users see static/pause-safe behavior without losing core evidence content.",
      blockerIf: "Motion keeps running or evidence content disappears when motion is reduced.",
      traceTarget: "screenshot",
      state: "required",
    }),
  ];

  return {
    schemaVersion: SCHEMA,
    scriptMode: "manual_vercel_browser_replay_required",
    replayId: stableId(`VLM-BROWSER-REPLAY-${triage.token.symbol}-${triage.boardId}-${createdAt}`),
    createdAt,
    token: triage.token,
    replayDecision: "blocked_until_run",
    qaHudRequired: true,
    webglComparisonAllowed,
    customerExportReady: false,
    binaryPdfReady: false,
    steps,
    operatorSummary: "PASS245 turns the release triage into a concrete browser replay script instead of pretending static guards prove UI behavior.",
    nextMilestone: "Run the replay on Vercel, attach screenshots/FPS/route traces, then decide whether DOM Orbit or WebGL should own the next visual lane.",
  };
}

export const PASS245_VLM_BRAIN_BROWSER_REPLAY_SCRIPT_CONTRACT = true;
