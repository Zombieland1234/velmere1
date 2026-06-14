export type PublicA4PdfBrowserFullscreenOrbitGateInput = {
  surface: "vlm_browser" | "shield_map" | "orbit_360" | "collection" | "security";
  a4PreviewVisible?: boolean;
  autoPopupDisabled?: boolean;
  pdfDownloadReady?: boolean;
  fullscreenOrbitEnabled?: boolean;
  rightEdgeDrawerAnimated?: boolean;
  drawerScrollNative?: boolean;
  suggestionsAnchored?: boolean;
  lookbookCollection?: boolean;
  operatorWallVisible?: boolean;
  liveSourceRateLimited?: boolean;
  mexcLiveWindowSeconds?: number;
  dppTraceabilityScore?: number;
  scarcityPressure?: number;
};

export type PublicA4PdfBrowserFullscreenOrbitGate = {
  passId: "PASS326";
  uiInnovation: "a4_evidence_sheet_browser";
  surface: PublicA4PdfBrowserFullscreenOrbitGateInput["surface"];
  publicMode: "print_ready" | "preview_ready" | "repair_needed" | "operator_hold";
  eliteStatus: "signed_a4_preview" | "private_sheet" | "live_source_hold" | "withheld";
  readinessScore: number;
  customerLine: string;
  internalFixes: string[];
  antiFomoBoundary: string;
  nextAction: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildPublicA4PdfBrowserFullscreenOrbitGate(
  input: PublicA4PdfBrowserFullscreenOrbitGateInput,
): PublicA4PdfBrowserFullscreenOrbitGate {
  const dppScore = clamp(input.dppTraceabilityScore ?? 66);
  const liveWindow = input.mexcLiveWindowSeconds ?? 360;
  const livePenalty = liveWindow < 90 ? 20 : liveWindow < 240 ? 8 : 0;
  const rateLimitPenalty = input.liveSourceRateLimited ? 12 : 0;
  const operatorPenalty = input.operatorWallVisible ? 30 : 0;
  const scarcityPenalty = Math.min(24, Math.max(0, input.scarcityPressure ?? 0));

  const score = clamp(
    28 +
      dppScore * 0.24 +
      (input.a4PreviewVisible ? 14 : 0) +
      (input.autoPopupDisabled ? 12 : 0) +
      (input.pdfDownloadReady ? 14 : 0) +
      (input.fullscreenOrbitEnabled ? 10 : 0) +
      (input.rightEdgeDrawerAnimated ? 8 : 0) +
      (input.drawerScrollNative ? 10 : 0) +
      (input.suggestionsAnchored ? 8 : 0) +
      (input.lookbookCollection ? 8 : 0) -
      livePenalty -
      rateLimitPenalty -
      operatorPenalty -
      scarcityPenalty,
  );

  const publicMode: PublicA4PdfBrowserFullscreenOrbitGate["publicMode"] =
    operatorPenalty > 0 || scarcityPenalty > 12
      ? "operator_hold"
      : input.a4PreviewVisible && input.autoPopupDisabled && input.pdfDownloadReady && score >= 82
        ? "print_ready"
        : input.a4PreviewVisible && input.drawerScrollNative && input.suggestionsAnchored
          ? "preview_ready"
          : "repair_needed";

  const eliteStatus: PublicA4PdfBrowserFullscreenOrbitGate["eliteStatus"] =
    publicMode === "print_ready"
      ? "signed_a4_preview"
      : publicMode === "preview_ready"
        ? "private_sheet"
        : input.liveSourceRateLimited
          ? "live_source_hold"
          : "withheld";

  return {
    passId: "PASS326",
    uiInnovation: "a4_evidence_sheet_browser",
    surface: input.surface,
    publicMode,
    eliteStatus,
    readinessScore: score,
    customerLine:
      publicMode === "print_ready"
        ? "The user sees a quiet A4 evidence sheet, can download a signed PDF, and is not pushed into Shield unless they choose it."
        : publicMode === "preview_ready"
          ? "The A4 sheet is visible in-page; remaining work stays in operator review without forcing a popup."
          : publicMode === "operator_hold"
            ? "Operator walls, fake scarcity or noisy proof debt must stay out of public UI."
            : "Repair the visible customer path before adding more proof panels.",
    internalFixes: [
      "A4 print sheet preview instead of auto modal",
      "real PDF download endpoint without extra dependencies",
      "fullscreen Orbit 360 for Basic / Pro / Advanced",
      "right-edge native-scroll detail drawer",
      "search suggestions anchored to the input",
      "lookbook-first collection surface",
      "security and blocker map moved into a new-chat handoff file",
    ],
    antiFomoBoundary:
      "Premium status may feel private and signed, but it must not use countdowns, fake scarcity, wallet pressure, ROI language, safety guarantees or trade instructions.",
    nextAction:
      publicMode === "repair_needed"
        ? "continue public QA on A4 sheet, Orbit drawer scroll, search dropdown anchoring and collection lookbook density"
        : "move remaining operator maps to admin/docs while the public route stays product-first",
  };
}

// PASS326 marker: public Lens uses an A4 evidence sheet, not an auto-opening popup.
// PASS326 marker: Orbit 360 opens fullscreen; clicked tile detail slides from the right edge and scrolls natively.
// PASS326 marker: collection becomes a lookbook, while provider/SKU/security blockers stay operator-only.
