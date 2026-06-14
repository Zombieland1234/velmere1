import type { TokenRiskResult } from "./risk-types";
import type { EvidenceNoteIntegrityGate } from "./evidence-note-integrity-gate";
import type { LayoutStabilitySentinelGate } from "./layout-stability-sentinel-gate";
import type { LensReportPreviewGate } from "./lens-report-preview-gate";
import type { OperatorOnlyReportFieldGate } from "./operator-only-report-field-gate";
import type { PdfForgeComposerGate } from "./pdf-forge-composer-gate";

// PASS291 guard marker: PDF/browser replay boundary keeps the branded PDF forge behind layout, source and operator replay proof.
export type PdfBrowserReplayBoundaryStatus =
  | "replay_quarantine"
  | "browser_replay_required"
  | "operator_pdf_replay"
  | "velmere_replay_seal";

export type PdfBrowserReplayBoundaryTone = "green" | "gold" | "cyan" | "amber" | "red" | "neutral";

export type PdfBrowserReplayBoundaryStageState = "passed" | "watch" | "operator_only" | "blocked";

export type PdfBrowserReplayBoundaryStage = {
  id:
    | "right_edge_drawer"
    | "scroll_container"
    | "mobile_safe_area"
    | "pdf_blob"
    | "download_callback"
    | "source_appendix"
    | "operator_fields"
    | "signature_boundary";
  label: string;
  value: string;
  state: PdfBrowserReplayBoundaryStageState;
  note: string;
};

export type PdfBrowserReplayBoundaryRail = {
  id: "layout" | "pdf" | "source" | "operator" | "signature" | "seal";
  label: string;
  value: string;
  tone: PdfBrowserReplayBoundaryTone;
  note: string;
};

export type PdfBrowserReplayBoundaryGate = {
  version: "velmere_pdf_browser_replay_boundary_gate_v1_pass291";
  replayId: string;
  status: PdfBrowserReplayBoundaryStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  stages: PdfBrowserReplayBoundaryStage[];
  rails: PdfBrowserReplayBoundaryRail[];
  replayScript: string[];
  previewLines: string[];
  blockers: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeSymbol(result: TokenRiskResult) {
  return (result.token.symbol || "TOKEN").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16) || "TOKEN";
}

function parseScore(value?: string) {
  const raw = value?.match(/(\d+)\/100/)?.[1];
  return raw ? Number(raw) : undefined;
}

function toneFromScore(score: number): PdfBrowserReplayBoundaryTone {
  if (score >= 88) return "green";
  if (score >= 74) return "gold";
  if (score >= 60) return "cyan";
  if (score >= 42) return "amber";
  return "red";
}

function stateStress(state: PdfBrowserReplayBoundaryStageState) {
  if (state === "passed") return 0;
  if (state === "watch") return 22;
  if (state === "operator_only") return 48;
  return 88;
}

function pdfBlocked(gate: PdfForgeComposerGate) {
  return gate.status === "pdf_quarantined" || gate.blockers.length > 0;
}

function layoutNeedsReplay(gate: LayoutStabilitySentinelGate) {
  return gate.status === "layout_quarantined" || gate.status === "scroll_watch" || gate.fixes.length > 0;
}

function previewNeedsReplay(gate: LensReportPreviewGate) {
  return gate.status === "preview_frozen" || gate.blockers.length > 2;
}

function noteNeedsReplay(gate: EvidenceNoteIntegrityGate) {
  return gate.status === "note_quarantined" || gate.status === "source_note_review";
}

function operatorLocks(gate: OperatorOnlyReportFieldGate) {
  return gate.status === "report_field_quarantine" || gate.status === "operator_review_lane" || gate.blockers.length >= 4;
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function buildPdfBrowserReplayBoundaryGate(
  result: TokenRiskResult,
  pdfForgeComposerGate: PdfForgeComposerGate,
  layoutStabilitySentinelGate: LayoutStabilitySentinelGate,
  operatorOnlyReportFieldGate: OperatorOnlyReportFieldGate,
  lensReportPreviewGate: LensReportPreviewGate,
  evidenceNoteIntegrityGate: EvidenceNoteIntegrityGate,
): PdfBrowserReplayBoundaryGate {
  const symbol = safeSymbol(result);
  const layoutReplay = layoutNeedsReplay(layoutStabilitySentinelGate);
  const pdfReplay = pdfBlocked(pdfForgeComposerGate);
  const previewReplay = previewNeedsReplay(lensReportPreviewGate);
  const noteReplay = noteNeedsReplay(evidenceNoteIntegrityGate);
  const operatorReplay = operatorLocks(operatorOnlyReportFieldGate);
  const highRiskReplay = result.level === "critical" || result.level === "high";
  const layoutScore = parseScore(layoutStabilitySentinelGate.trustBadge) ?? 58;
  const pdfScore = parseScore(pdfForgeComposerGate.trustBadge) ?? 54;
  const disclosureScore = parseScore(operatorOnlyReportFieldGate.trustBadge) ?? 56;

  const stages: PdfBrowserReplayBoundaryStage[] = [
    {
      id: "right_edge_drawer",
      label: "right-edge drawer",
      value: layoutReplay ? "watch" : "stable",
      state: layoutReplay ? "watch" : "passed",
      note: "Orbit 360 tile details must slide from the right edge and preserve their own scroll lane.",
    },
    {
      id: "scroll_container",
      label: "scroll container",
      value: layoutReplay ? "replay" : "contained",
      state: layoutReplay ? "watch" : "passed",
      note: "Wheel/touch events stay inside the drawer so the chart and modal background do not steal the scroll.",
    },
    {
      id: "mobile_safe_area",
      label: "mobile safe area",
      value: layoutStabilitySentinelGate.status === "layout_quarantined" ? "blocked" : "right rail",
      state: layoutStabilitySentinelGate.status === "layout_quarantined" ? "blocked" : "passed",
      note: "Compact screens keep the right-edge pattern instead of collapsing report proof into a hidden bottom sheet.",
    },
    {
      id: "pdf_blob",
      label: "PDF blob",
      value: pdfReplay ? "preview only" : "client ready",
      state: pdfReplay ? "operator_only" : "passed",
      note: "The PDF is a local preview packet until server storage, redaction and source replay are proven.",
    },
    {
      id: "download_callback",
      label: "download callback",
      value: "defined",
      state: "passed",
      note: "PASS291 keeps the previous runtime fix: download callbacks remain defined before buttons are rendered.",
    },
    {
      id: "source_appendix",
      label: "source appendix",
      value: previewReplay || noteReplay ? "needs replay" : "bounded",
      state: previewReplay || noteReplay ? "operator_only" : "passed",
      note: "MEXC-style chart/depth/source context stays attached as evidence, not as marketing decoration.",
    },
    {
      id: "operator_fields",
      label: "operator fields",
      value: operatorReplay ? "vault" : "separated",
      state: operatorReplay ? "operator_only" : "passed",
      note: "Operator reasoning, raw payload and private notes remain separated from customer PDF lines.",
    },
    {
      id: "signature_boundary",
      label: "signature boundary",
      value: highRiskReplay ? "non-advisory" : "brand seal",
      state: highRiskReplay ? "watch" : "passed",
      note: "Velmère Cybersecurity branding is a preview signature, not a certificate, guarantee or investment recommendation.",
    },
  ];

  const blockers = [
    layoutReplay ? "right-edge drawer or compact layout still needs replay evidence" : null,
    pdfReplay ? "PDF forge remains preview/operator bounded" : null,
    previewReplay ? "Lens report preview is frozen or has source blockers" : null,
    noteReplay ? "evidence note still requires source/operator review" : null,
    operatorReplay ? "operator-only fields still block customer PDF release" : null,
    highRiskReplay ? "high review pressure must keep non-advisory labels visible" : null,
  ].filter((item): item is string => Boolean(item));

  const stageStress = Math.round(stages.reduce((sum, stage) => sum + stateStress(stage.state), 0) / stages.length);
  const replayScore = Math.round(
    clamp(100 - stageStress * 0.48 + layoutScore * 0.16 + pdfScore * 0.14 + disclosureScore * 0.14 - blockers.length * 3, 0, 100),
  );

  const status: PdfBrowserReplayBoundaryStatus =
    stages.some((stage) => stage.state === "blocked") || blockers.length >= 5
      ? "replay_quarantine"
      : layoutReplay || blockers.length >= 3
        ? "browser_replay_required"
        : blockers.length >= 1 || replayScore < 82
          ? "operator_pdf_replay"
          : "velmere_replay_seal";

  const rails: PdfBrowserReplayBoundaryRail[] = [
    {
      id: "layout",
      label: "Layout replay",
      value: layoutReplay ? "watch" : "stable",
      tone: layoutReplay ? "amber" : "green",
      note: "Right-edge drawer, safe-area and scroll containment gate the report surface.",
    },
    {
      id: "pdf",
      label: "PDF forge",
      value: pdfReplay ? "operator preview" : "ready preview",
      tone: pdfReplay ? "amber" : "green",
      note: "PDF creation is allowed as bounded preview, not a public certificate.",
    },
    {
      id: "source",
      label: "Source appendix",
      value: previewReplay || noteReplay ? "review" : "attached",
      tone: previewReplay || noteReplay ? "amber" : "cyan",
      note: "Chart, depth and evidence notes stay close to the customer-safe summary.",
    },
    {
      id: "operator",
      label: "Operator vault",
      value: operatorReplay ? "locked" : "separated",
      tone: operatorReplay ? "red" : "gold",
      note: "Private fields stay behind the disclosure loom before any export path.",
    },
    {
      id: "signature",
      label: "Signature",
      value: highRiskReplay ? "bounded" : "Velmère",
      tone: highRiskReplay ? "amber" : "gold",
      note: "Elite status is a calm proof state earned by replay, not by countdown/FOMO pressure.",
    },
    {
      id: "seal",
      label: "Replay seal",
      value: `${replayScore}/100`,
      tone: toneFromScore(replayScore),
      note: "New UI innovation: the Ghost Replay Seal unlocks only after scroll, source, PDF and operator separation agree.",
    },
  ];

  return {
    version: "velmere_pdf_browser_replay_boundary_gate_v1_pass291",
    replayId: `VLM-REPLAY-${symbol}-${String(replayScore).padStart(3, "0")}`,
    status,
    headline:
      status === "velmere_replay_seal"
        ? "Ghost Replay Seal is holding the PDF/browser boundary"
        : "PDF preview stays behind browser replay and right-edge scroll proof",
    trustBadge: `Replay seal ${replayScore}/100`,
    operatorCue:
      "PASS291 adds a Ghost Replay Seal: the branded PDF flow is checked against right-edge Orbit scrolling, source appendix, private field separation and non-advisory signature boundaries before export language is allowed.",
    stages,
    rails,
    replayScript: [
      "Open Shield token modal and drag the chart without moving the Orbit drawer.",
      "Open Orbit 360, click three tiles, confirm each detail panel slides from the right edge.",
      "Scroll inside the tile detail panel on mouse wheel and touch without background scroll leakage.",
      "Run the PDF forge, download the preview, and verify the Velmère Cybersecurity label remains non-advisory.",
      "Open customer preview and confirm operator-only fields/raw evidence are not present.",
      "Repeat on compact viewport; the drawer must remain a right-edge rail with safe-area padding.",
    ],
    previewLines: [
      `${symbol} PDF preview is gated by browser replay and private disclosure separation.`,
      blockers[0] ? `Primary blocker: ${normalizeLine(blockers[0])}.` : "Primary blocker: no replay blocker detected in this static preview.",
      "No buy/sell prompt, no countdown, no assured safety, no certificate wording and no investment recommendation.",
    ],
    blockers,
    nextAction:
      blockers.length > 0
        ? `capture replay evidence for ${blockers.length} PDF/browser boundary blockers`
        : "attach the Ghost Replay Seal to the next customer-safe PDF preview packet",
    customerBoundary:
      "The Ghost Replay Seal is an internal UI/report readiness state. It is not a certificate, legal opinion, safety verdict, financial advice or investment recommendation.",
  };
}

export function serializePdfBrowserReplayBoundaryPacket(gate: PdfBrowserReplayBoundaryGate) {
  return JSON.stringify(
    {
      version: gate.version,
      replayId: gate.replayId,
      status: gate.status,
      trustBadge: gate.trustBadge,
      blockers: gate.blockers,
      replayScript: gate.replayScript,
      previewLines: gate.previewLines,
      customerBoundary: gate.customerBoundary,
      generatedBy: "Velmere Cybersecurity PDF/browser replay boundary preview",
    },
    null,
    2,
  );
}
