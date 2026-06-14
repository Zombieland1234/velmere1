export type PublicPdfFirstBrowserOrbitScrollGateInput = {
  surface: "vlm_browser" | "shield_terminal" | "orbit_360" | "global";
  publicOperatorWallHidden?: boolean;
  pdfPreviewPrimary?: boolean;
  fullShieldSecondary?: boolean;
  orbitDrawerHardScrollable?: boolean;
  rightEdgeAnimation?: boolean;
  suggestionLayerAboveCards?: boolean;
  brandedSignature?: boolean;
};

export type PublicPdfFirstBrowserOrbitScrollGate = {
  id: "PASS325_PUBLIC_PDF_FIRST_BROWSER_ORBIT_SCROLL";
  uiInnovation: "Signed PDF Glass Preview";
  publicMode: "pdf_first" | "needs_cleanup";
  customerPath: string[];
  hiddenOperatorSurfaces: string[];
  score: number;
  ready: boolean;
  safetyBoundary: string;
  nextAction: string;
};

function scoreBool(value: boolean | undefined, weight: number) {
  return value ? weight : 0;
}

export function buildPublicPdfFirstBrowserOrbitScrollGate(input: PublicPdfFirstBrowserOrbitScrollGateInput): PublicPdfFirstBrowserOrbitScrollGate {
  const score = Math.min(
    100,
    scoreBool(input.publicOperatorWallHidden, 22) +
      scoreBool(input.pdfPreviewPrimary, 22) +
      scoreBool(input.fullShieldSecondary, 10) +
      scoreBool(input.orbitDrawerHardScrollable, 18) +
      scoreBool(input.rightEdgeAnimation, 14) +
      scoreBool(input.suggestionLayerAboveCards, 8) +
      scoreBool(input.brandedSignature, 6),
  );

  return {
    id: "PASS325_PUBLIC_PDF_FIRST_BROWSER_ORBIT_SCROLL",
    uiInnovation: "Signed PDF Glass Preview",
    publicMode: score >= 84 ? "pdf_first" : "needs_cleanup",
    customerPath: [
      "search token",
      "open signed PDF preview",
      "read short source boundary",
      "download preview",
      "open Shield only as secondary review",
    ],
    hiddenOperatorSurfaces: [
      "Social-Exchange PASS wall",
      "operator sync rails",
      "raw proof percentages",
      "full Shield analysis as default path",
    ],
    score,
    ready: score >= 84 && Boolean(input.publicOperatorWallHidden && input.pdfPreviewPrimary),
    safetyBoundary: "Public Browser is PDF-preview-first and keeps Shield/market analysis non-advisory. It does not give buy/sell calls, guaranteed safety, solvency promises or fake scarcity.",
    nextAction: input.surface === "orbit_360"
      ? "Run real browser replay on wheel/touch scroll inside the right-edge tile drawer."
      : "Keep the public route short: search, PDF preview, Velmère signature, optional Shield review.",
  };
}
