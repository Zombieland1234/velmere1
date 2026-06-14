import type { TokenRiskResult } from "./risk-types";
import type { PdfForgeComposerGate } from "./pdf-forge-composer-gate";

// PASS289 guard marker: viewport layout sentinel keeps Orbit detail right-edge scroll, token modal rails and PDF forge controls inside safe interaction zones.
export type LayoutStabilitySentinelStatus =
  | "layout_quarantined"
  | "scroll_watch"
  | "operator_layout_ready"
  | "velmere_layout_sealed";

export type LayoutStabilityRailState = "sealed" | "watch" | "repair" | "operator_only";

export type LayoutStabilityRail = {
  id: "orbit_drawer" | "modal_density" | "pdf_forge" | "mobile_edge" | "source_hierarchy" | "anti_fomo";
  label: string;
  value: string;
  state: LayoutStabilityRailState;
  note: string;
};

export type LayoutStabilitySentinelGate = {
  version: "velmere_layout_stability_sentinel_gate_v1_pass289";
  layoutId: string;
  status: LayoutStabilitySentinelStatus;
  headline: string;
  trustBadge: string;
  operatorCue: string;
  rails: LayoutStabilityRail[];
  fixes: string[];
  nextAction: string;
  customerBoundary: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeSymbol(result: TokenRiskResult) {
  return (result.token.symbol || "TOKEN").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 14) || "TOKEN";
}

function modeLabel(mode: string) {
  if (mode === "advanced") return "right-edge advanced";
  if (mode === "pro") return "right-edge pro";
  return "right-edge basic";
}

export function buildLayoutStabilitySentinelGate(
  result: TokenRiskResult,
  pdfForgeComposerGate: PdfForgeComposerGate,
  mode: string,
): LayoutStabilitySentinelGate {
  const symbol = safeSymbol(result);
  const confidence = Math.round((result.confidence ?? 0.35) * 100);
  const pdfBlocked =
    pdfForgeComposerGate.status === "pdf_quarantined" || pdfForgeComposerGate.blockers.length > 2;
  const pdfWorking = pdfForgeComposerGate.status === "pdf_forging" || pdfForgeComposerGate.blockers.length > 0;
  const severeRisk = result.level === "critical" || result.level === "high";
  const missingSignalCount = result.signals.filter((signal) => signal.id === "insufficient_data").length;
  const missingSourcePressure =
    missingSignalCount + (result.dataQuality === "live" ? 0 : 1) + pdfForgeComposerGate.blockers.length;

  const rails: LayoutStabilityRail[] = [
    {
      id: "orbit_drawer",
      label: "Orbit detail drawer",
      value: "right edge scroll",
      state: "sealed",
      note: "Tile detail opens from the right edge and keeps its own vertical scroll instead of trapping the page.",
    },
    {
      id: "modal_density",
      label: "Modal density",
      value: modeLabel(mode),
      state: mode === "advanced" ? "watch" : "sealed",
      note:
        mode === "advanced"
          ? "Advanced can show more proof rails, but the rail stack stays in compact cards to avoid wall-of-text overload."
          : "Basic and Pro keep fewer visible rails so the chart, source state and next action remain readable.",
    },
    {
      id: "pdf_forge",
      label: "PDF forge controls",
      value: pdfBlocked ? "export held" : pdfWorking ? "preview building" : "preview ready",
      state: pdfBlocked ? "operator_only" : pdfWorking ? "watch" : "sealed",
      note: "PDF download stays a branded preview packet with source, redaction and retention boundaries visible.",
    },
    {
      id: "mobile_edge",
      label: "Mobile edge sheet",
      value: "right-side safe area",
      state: "sealed",
      note: "Small screens keep the drawer as a right-edge sheet with safe-area padding instead of a bottom drawer that hides context.",
    },
    {
      id: "source_hierarchy",
      label: "Source hierarchy",
      value: missingSourcePressure > 2 ? "source gaps visible" : "proof hierarchy visible",
      state: missingSourcePressure > 2 ? "watch" : "sealed",
      note: "Freshness, storage, privacy and report rails are grouped as proof steps so badges do not cover the data.",
    },
    {
      id: "anti_fomo",
      label: "Anti-FOMO brake",
      value: severeRisk ? "cooldown visible" : "calm status",
      state: severeRisk ? "repair" : "sealed",
      note: "High pressure never becomes urgency copy; it becomes a calm review brake and next-source instruction.",
    },
  ];

  const fixes = [
    "right-edge Orbit drawer stays scrollable with overscroll containment and touch pan-y",
    "mobile drawer remains anchored to the right edge instead of switching to a bottom sheet",
    "PDF forge controls keep object URL cleanup and branded preview wording",
    "proof rails are compacted into source hierarchy cards instead of covering chart data",
    severeRisk ? "high-risk visual pressure is converted into anti-FOMO cooldown copy" : "calm status copy preserved without countdowns or trade prompts",
  ];

  const score = Math.round(
    clamp(
      48 +
        (pdfBlocked ? 4 : pdfWorking ? 15 : 24) +
        (mode === "advanced" ? 8 : 12) +
        (missingSourcePressure > 2 ? 3 : 10) +
        (severeRisk ? 2 : 8) +
        confidence * 0.08,
    ),
  );

  const status: LayoutStabilitySentinelStatus =
    pdfBlocked || severeRisk
      ? "scroll_watch"
      : score >= 88
        ? "velmere_layout_sealed"
        : score >= 74
          ? "operator_layout_ready"
          : "layout_quarantined";

  return {
    version: "velmere_layout_stability_sentinel_gate_v1_pass289",
    layoutId: `VLM-LAYOUT-${symbol}-${String(score).padStart(3, "0")}`,
    status,
    headline:
      status === "velmere_layout_sealed"
        ? "Layout seal is holding"
        : "Layout sentinel is watching scroll and proof density",
    trustBadge: `Layout seal ${score}/100`,
    operatorCue:
      "The modal now treats layout like a trading surface: chart first, right-edge evidence second, PDF forge third, and no urgency theatre.",
    rails,
    fixes,
    nextAction:
      status === "velmere_layout_sealed"
        ? "keep browser replay for right-edge drawer, mobile safe-area and PDF preview download"
        : "run browser replay on Orbit tile click, wheel/touch scroll and PDF forge controls before public release",
    customerBoundary:
      "The layout seal is a UI stability indicator. It is not a market signal, safety certificate or investment recommendation.",
  };
}
