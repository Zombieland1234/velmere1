export type PublicPdfPreviewOrbitRepairGateInput = {
  surface: "home" | "vlm_browser" | "shield_terminal" | "orbit_360" | "global";
  hasPublicOperatorWall?: boolean;
  hasPdfPreviewModal?: boolean;
  orbitDrawerAnimated?: boolean;
  orbitDrawerScrollable?: boolean;
  searchSuggestionsOverlaySafe?: boolean;
  brandedSignatureReady?: boolean;
};

export type PublicPdfPreviewOrbitRepairGate = {
  id: "PASS324_PUBLIC_PDF_PREVIEW_ORBIT_REPAIR";
  publicMode: "clean_showroom" | "pdf_preview_first" | "operator_wall_blocked";
  uiInnovation: "Ghost-Signed PDF Atelier Modal";
  customerPath: string[];
  hiddenOperatorSurfaces: string[];
  repairScore: number;
  readyForPublicPreview: boolean;
  safetyBoundary: string;
  nextAction: string;
};

function boolScore(value: boolean | undefined, weight: number) {
  return value ? weight : 0;
}

export function buildPublicPdfPreviewOrbitRepairGate(input: PublicPdfPreviewOrbitRepairGateInput): PublicPdfPreviewOrbitRepairGate {
  const repairScore = Math.min(
    100,
    boolScore(!input.hasPublicOperatorWall, 24) +
      boolScore(input.hasPdfPreviewModal, 22) +
      boolScore(input.orbitDrawerAnimated, 18) +
      boolScore(input.orbitDrawerScrollable, 18) +
      boolScore(input.searchSuggestionsOverlaySafe, 10) +
      boolScore(input.brandedSignatureReady, 8),
  );

  const publicMode = input.hasPublicOperatorWall
    ? "operator_wall_blocked"
    : input.hasPdfPreviewModal
      ? "pdf_preview_first"
      : "clean_showroom";

  return {
    id: "PASS324_PUBLIC_PDF_PREVIEW_ORBIT_REPAIR",
    publicMode,
    uiInnovation: "Ghost-Signed PDF Atelier Modal",
    customerPath: ["search token", "open branded PDF preview", "read source boundary", "download preview", "open Shield only after review"],
    hiddenOperatorSurfaces: ["Social-Exchange PASS wall", "raw proof scores", "operator sync rails", "internal guard cues"],
    repairScore,
    readyForPublicPreview: repairScore >= 86 && !input.hasPublicOperatorWall,
    safetyBoundary:
      "Public Lens shows a branded PDF preview and calm source boundary. It does not claim safety, solvency, investment advice or final verification.",
    nextAction:
      input.surface === "orbit_360"
        ? "Browser-test tile drawer wheel/touch scroll and right-edge slide animation."
        : "Keep public UI PDF-first and move full Shield analysis behind review intent.",
  };
}
