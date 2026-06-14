import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const errors = [];
const read = (file) => readFileSync(new URL(file, root), "utf8");
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

const shared = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
for (const needle of [
  "data-unified-asset-orbit-stage=\"messenger-bubbles\"",
  "data-unified-asset-circular-chart=\"true\"",
  "data-unified-asset-bubble-rail=\"true\"",
  "data-unified-asset-bubble-dock=\"true\"",
  "unified-asset-bubble-button",
]) {
  expect(shared.includes(needle), `Unified asset shell missing circular/bubble marker: ${needle}`);
}

const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
for (const needle of [
  "openUnifiedAuditMode",
  "onSelect={openUnifiedAuditMode}",
  "<VlmNeuralAuditExperience",
  "className=\"relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain touch-pan-y\"",
]) {
  expect(realMarkets.includes(needle), `Real Markets modal still lacks visible VLM runtime flow: ${needle}`);
}
expect(!realMarkets.includes("{selected && auditMode ? (\n        <VlmNeuralAuditExperience"), "Real Markets brain overlay must not sit outside ModalRoot.");

const shield = read("components/market-integrity/TokenRiskModal.tsx");
for (const needle of ["runVlmAiSequence", "onSelect={runVlmAiSequence}", "<VlmNeuralAuditExperience"]) {
  expect(shield.includes(needle), `Shield modal lost VLM analysis marker: ${needle}`);
}

const navbar = read("components/Navbar.tsx");
for (const needle of [
  "const [languageOpen, setLanguageOpen]",
  "<DropdownRoot",
  "surfaceData={{ surface: \"language-selector-anchored\" }}",
  "<div className=\"relative block\">",
]) {
  expect(navbar.includes(needle), `Navbar language dropdown marker missing: ${needle}`);
}

const overlay = read("components/ui/OverlayPrimitives.tsx");
for (const needle of ["useLayoutEffect", "setPosition(null)", "requestAnimationFrame(update)", "data-velmere-dropdown-root=\"true\""]) {
  expect(overlay.includes(needle), `DropdownRoot lost anchored runtime hardening: ${needle}`);
}

const cart = read("components/CartDrawer.tsx");
for (const needle of ["velmere-cart-bottom-sheet", "motionPreset=\"bottom\"", "surfaceData={{ surface: \"cart-bottom-sheet\" }}"]) {
  expect(cart.includes(needle), `Cart bottom/right sheet marker missing: ${needle}`);
}

const css = read("app/globals.css");
for (const needle of [
  "PASS1054-PASS1073",
  ".unified-asset-chart-orb",
  ".unified-asset-bubble-button",
  "@keyframes velmere-bubble-arrive",
  ".velmere-cart-bottom-sheet[data-velmere-motion-preset=\"bottom\"]",
  "[data-surface=\"language-selector-anchored\"]",
]) {
  expect(css.includes(needle), `CSS runtime polish missing: ${needle}`);
}

const pkg = JSON.parse(read("package.json"));
expect(pkg.scripts?.["verify:pass1054-1073-modal-bubbles-runtime"] === "node scripts/verify-pass1054-1073-modal-bubbles-runtime.mjs", "package.json missing PASS1054-1073 verifier script.");

if (errors.length) {
  console.error(`PASS1054-1073 modal bubbles runtime failed (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS1054-1073 modal bubbles runtime OK · circular chart shell, Real Markets brain, language dropdown and bottom cart hardened");
