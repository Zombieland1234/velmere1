import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
let ts;
try {
  ts = nativeRequire("typescript");
} catch {
  ts = nativeRequire("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function loadTs(relative) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative}: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n")}`);
  const module = { exports: {} };
  new Function("require", "module", "exports", output.outputText)(nativeRequire, module, module.exports);
  return module.exports;
}

const pass627 = loadTs("lib/ui/pass627-motion-constitution.ts");
const desktop = pass627.resolvePass627MotionProfile({});
const mobile = pass627.resolvePass627MotionProfile({ coarsePointer: true, compactViewport: true });
const reduced = pass627.resolvePass627MotionProfile({ reducedMotion: true });
assert(desktop.duration.emphasis > desktop.duration.standard, "PASS627 emphasis must be slower than standard");
assert(mobile.duration.standard < desktop.duration.standard, "PASS627 mobile budget must be shorter than desktop");
assert.equal(mobile.allowDecorativeLoop, false, "PASS627 coarse pointer must pause decorative loops");
assert.equal(reduced.duration.standard, 0, "PASS627 reduced motion must remove transition duration");
assert.equal(reduced.distance.panel, 0, "PASS627 reduced motion must remove spatial travel");
assert.equal(reduced.allowDecorativeLoop, false, "PASS627 reduced motion cannot keep loops");
assert(pass627.pass627StaggerDelay(99, desktop) <= (desktop.maxStaggerItems - 1) * desktop.staggerStep, "PASS627 stagger must be capped");

const pass628 = loadTs("lib/ui/pass628-overlay-constitution.ts");
assert.equal(pass628.assertPass628LayerOrder(), true, "PASS628 overlay order must be strictly increasing");
const layerValues = Object.values(pass628.VELMERE_OVERLAY_LAYERS);
assert(Math.max(...layerValues) <= 100, "PASS628 layer ladder must remain finite");
assert(pass628.VELMERE_OVERLAY_LAYERS.listbox < pass628.VELMERE_OVERLAY_LAYERS.modalBackdrop, "PASS628 listboxes must stay below modals");
assert(pass628.VELMERE_OVERLAY_LAYERS.modal < pass628.VELMERE_OVERLAY_LAYERS.nestedBackdrop, "PASS628 nested overlays must sit above base modal");

const pass629 = loadTs("lib/ui/pass629-scroll-ownership-constitution.ts");
const middle = pass629.resolvePass629ScrollOwnership({ activeOwners: 1, regionScrollTop: 50, regionScrollHeight: 500, regionClientHeight: 200, deltaY: 20 });
const bottom = pass629.resolvePass629ScrollOwnership({ activeOwners: 1, regionScrollTop: 300, regionScrollHeight: 500, regionClientHeight: 200, deltaY: 20 });
const stacked = pass629.resolvePass629ScrollOwnership({ activeOwners: 2, regionScrollTop: 0, regionScrollHeight: 500, regionClientHeight: 200, deltaY: -20 });
assert.equal(middle.regionCanConsume, true, "PASS629 modal region must own scroll in the middle");
assert.equal(bottom.preventBackgroundScroll, true, "PASS629 wheel at boundary cannot leak to page");
assert.equal(stacked.restorePagePositionOnFinalClose, false, "PASS629 stacked overlay cannot restore page early");

const pass630 = loadTs("lib/ui/pass630-perceived-performance-shell.ts");
const stable = pass630.buildPass630StableShell({ surface: "shield", phase: "pending", minHeightPx: 560, finalMinHeightPx: 560 });
const unstable = pass630.buildPass630StableShell({ surface: "pdf", phase: "pending", minHeightPx: 240, finalMinHeightPx: 620 });
assert.equal(stable.layoutShiftRisk, "low", "PASS630 equal geometry must be low risk");
assert.equal(stable.ariaBusy, true, "PASS630 pending shell must be busy");
assert.equal(unstable.layoutShiftRisk, "review", "PASS630 large geometry mismatch must be review");

const pass631 = loadTs("lib/ui/pass631-accessibility-sweep.ts");
for (const [state, ratio] of Object.entries(pass631.PASS631_SOURCE_STATE_CONTRAST)) {
  assert(ratio >= 4.5, `PASS631 ${state} source state contrast must reach 4.5:1`);
}
const accessibility = pass631.auditPass631Accessibility({
  reducedMotionFunctional: true,
  focusContained: true,
  focusReturned: true,
  escapeCloses: true,
  minimumTargetPx: 44,
  textContrastRatio: 7,
  nonTextContrastRatio: 3.2,
});
assert.equal(accessibility.state, "pass", `PASS631 accessibility blockers: ${accessibility.blockers.join(", ")}`);

const modalLock = read("components/ui/useModalScrollLock.ts");
assert(!modalLock.includes('body.style.touchAction = "none"'), "PASS629 body touch-action cannot disable modal-region pan");
for (const marker of [
  "installScrollOwnershipListeners",
  "data-modal-scroll-region",
  "scrollbarGutter",
  "removeOwnershipListeners",
  "window.requestAnimationFrame(() => window.scrollTo(current.scrollX, current.scrollY))",
]) {
  assert(modalLock.includes(marker), `PASS629 shared modal lock missing ${marker}`);
}

const motionHook = read("components/ui/useVelmereMotionProfile.ts");
assert(motionHook.includes("(pointer: coarse)"), "PASS627 hook must detect coarse pointer");
assert(motionHook.includes("useReducedMotion"), "PASS627 hook must respect reduced motion");

const stableSkeleton = read("components/ui/StableSkeleton.tsx");
assert(stableSkeleton.includes("buildPass630StableShell"), "PASS630 skeleton must use geometry contract");
assert(stableSkeleton.includes("data-pass630-preserve-geometry"), "PASS630 skeleton must expose geometry receipt");

const css = read("app/globals.css");
for (const marker of [
  "PASS627–631 · premium motion",
  "--velmere-layer-listbox",
  "--velmere-layer-nested-modal",
  "[data-modal-scroll-region=\"true\"]",
  ".velmere-stable-skeleton",
  "@media (prefers-reduced-motion: reduce)",
  "@media (forced-colors: active)",
]) {
  assert(css.includes(marker), `PASS627–631 CSS missing ${marker}`);
}

const activeUiSources = [
  "app/globals.css",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/vlm/VlmModeSwitch.tsx",
  "components/wallet/WalletConnectOptions.tsx",
].map((relative) => [relative, stripComments(read(relative))]);
for (const [relative, source] of activeUiSources) {
  const cssValues = [...source.matchAll(/z-index\s*:\s*(\d+)/g)].map((match) => Number(match[1]));
  const classValues = [...source.matchAll(/z-\[(\d+)\]/g)].map((match) => Number(match[1]));
  const max = Math.max(0, ...cssValues, ...classValues);
  assert(max <= 500, `PASS628 ${relative} still contains active unbounded z-index ${max}`);
}

for (const [relative, markers] of Object.entries({
  "components/PageTransition.tsx": ["useVelmereMotionProfile", "data-pass627-motion-profile"],
  "components/ui/SideActionPanel.tsx": ["useModalScrollLock(open)", "useDialogFocusBoundary", "data-pass628-overlay-layer"],
  "components/Navbar.tsx": ["useModalScrollLock(menuOpen)", "data-modal-scroll-region=\"true\""],
  "components/vlm/VlmModeSwitch.tsx": ["useDialogFocusBoundary", "pass628LayerStyle", "data-pass627-motion-profile"],
  "components/market-integrity/MarketIntegrityClient.tsx": ["StableSkeleton", "data-pass630-stable-loader"],
})) {
  const source = read(relative);
  for (const marker of markers) assert(source.includes(marker), `${relative} missing ${marker}`);
}

console.log("PASS627–631 premium interaction constitution verified");
