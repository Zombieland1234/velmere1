export type Pass1314ScreenshotSurface = {
  artifact: string;
  sidecar: `${string}.png.json`;
  route: string;
  viewport: "desktop" | "mobile";
  selector: string;
  minimumBytes: number;
  minimumWidth: number;
  minimumHeight: number;
  surface: string;
};

export type Pass1314PlaywrightScreenshotRepairGate = {
  id: "pass1314-playwright-screenshot-repair-gate";
  state: "ready_for_real_browser_run" | "proven_green";
  rule: "screenshots_must_have_png_dimensions_and_pass1314_sidecars_before_100";
  artifactRoot: "test-results/pass1274-runtime-visual-qa";
  runCommand: "npm run test:e2e:pass1314-1333";
  validatorCommand: "npm run verify:e2e:pass1274-1293-artifacts";
  pendingValidatorCommand: "npm run verify:e2e:pass1274-1293-artifacts:pending";
  requiredSurfaces: Pass1314ScreenshotSurface[];
  percentageCapUntilGreen: 96.4;
};

export const pass1314PlaywrightScreenshotRepairGate: Pass1314PlaywrightScreenshotRepairGate = {
  id: "pass1314-playwright-screenshot-repair-gate",
  state: "ready_for_real_browser_run",
  rule: "screenshots_must_have_png_dimensions_and_pass1314_sidecars_before_100",
  artifactRoot: "test-results/pass1274-runtime-visual-qa",
  runCommand: "npm run test:e2e:pass1314-1333",
  validatorCommand: "npm run verify:e2e:pass1274-1293-artifacts",
  pendingValidatorCommand: "npm run verify:e2e:pass1274-1293-artifacts:pending",
  percentageCapUntilGreen: 96.4,
  requiredSurfaces: [
    {
      artifact: "lens-reader-desktop-eth.png",
      sidecar: "lens-reader-desktop-eth.png.json",
      route: "/pl/search",
      viewport: "desktop",
      selector: "[data-testid=\"lens-preview-dialog\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Lens reader dialog",
    },
    {
      artifact: "lens-pdf-frame-desktop-eth.png",
      sidecar: "lens-pdf-frame-desktop-eth.png.json",
      route: "/pl/search",
      viewport: "desktop",
      selector: "[data-testid=\"lens-pdf-frame\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Lens binary PDF iframe",
    },
    {
      artifact: "lens-reader-mobile-eth.png",
      sidecar: "lens-reader-mobile-eth.png.json",
      route: "/pl/search",
      viewport: "mobile",
      selector: "[data-testid=\"lens-preview-dialog\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Lens reader dialog mobile",
    },
    {
      artifact: "header-language-mobile.png",
      sidecar: "header-language-mobile.png.json",
      route: "/pl",
      viewport: "mobile",
      selector: "[data-velmere-surface-id=\"velmere-header-language-menu\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Header language dropdown",
    },
    {
      artifact: "header-wallet-mobile.png",
      sidecar: "header-wallet-mobile.png.json",
      route: "/pl",
      viewport: "mobile",
      selector: "[data-velmere-surface-id=\"velmere-header-wallet-menu\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Header wallet dropdown",
    },
    {
      artifact: "header-cart-mobile.png",
      sidecar: "header-cart-mobile.png.json",
      route: "/pl",
      viewport: "mobile",
      selector: "#velmere-cart-bottom-sheet",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Cart bottom sheet",
    },
    {
      artifact: "shield-unified-modal.png",
      sidecar: "shield-unified-modal.png.json",
      route: "/pl/market-integrity",
      viewport: "desktop",
      selector: "[data-unified-asset-modal=\"shield\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Shield unified asset modal",
    },
    {
      artifact: "real-markets-unified-modal.png",
      sidecar: "real-markets-unified-modal.png.json",
      route: "/pl/market-integrity/cross-asset",
      viewport: "desktop",
      selector: "[data-unified-asset-modal=\"real-markets\"]",
      minimumBytes: 2048,
      minimumWidth: 96,
      minimumHeight: 40,
      surface: "Real Markets unified asset modal",
    },
  ],
};

export function getPass1314PlaywrightScreenshotRepairGate(): Pass1314PlaywrightScreenshotRepairGate {
  return pass1314PlaywrightScreenshotRepairGate;
}
