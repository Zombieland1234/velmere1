export const pass490ViewportMatrix = [
  { id: "mobile-compact", width: 360, height: 800 },
  { id: "mobile-modern", width: 390, height: 844 },
  { id: "tablet-portrait", width: 768, height: 1024 },
  { id: "desktop-standard", width: 1280, height: 800 },
  { id: "desktop-wide", width: 1440, height: 900 },
] as const;

export const pass490ProductionReleaseGate = {
  version: "pass490-production-release-gate",
  required: [
    "pdf-reader-binary-parity",
    "modal-safe-area-scroll-lock",
    "motion-budget-reduced-motion",
    "source-bound-neural-confidence",
    "keyboard-shield-lanes",
    "missing-data-visible",
    "typecheck",
    "next-production-build",
  ],
  viewportMatrix: pass490ViewportMatrix,
  noReleaseOn: [
    "hidden-unknown",
    "generated-market-data",
    "background-scroll-leak",
    "reader-binary-depth-mismatch",
    "unbounded-animation-loop",
  ],
} as const;
