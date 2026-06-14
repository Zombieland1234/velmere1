import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const gate = read("lib/market-integrity/pdf-forge-composer-gate.ts");
const lens = read("components/search/VelmereLensCommandRouter.tsx");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildPdfForgeComposerGate",
  "serializeVelmereCybersecurityPdf",
  "pdfForgeComposerGate",
  "downloadVelmereCybersecurityPdf",
  "data-pass288-pdf-forge-composer-gate",
  "shield-pass288-pdf-forge",
  "data-pass288-orbit-right-edge-scroll",
  "shield-vlm-detail-panel-edge",
  "onWheel={(event) => event.stopPropagation()}",
  "onTouchMove={(event) => event.stopPropagation()}",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS288 marker ${needle}`);
}

for (const needle of [
  "velmere_pdf_forge_composer_gate_v1_pass288",
  "PdfForgeComposerGate",
  "Velmère Cybersecurity",
  "Download Velmère PDF preview",
  "not a guarantee, certificate, investment recommendation or final legal report",
  "source stitching first",
  "privacy redaction second",
]) {
  if (!gate.includes(needle)) errors.push(`pdf-forge-composer-gate missing marker ${needle}`);
}

for (const needle of [
  "PASS288 — Orbit tile drawer right-edge scroll + VLM PDF forge animation",
  ".shield-vlm-detail-panel-portal.shield-vlm-detail-panel-edge",
  "transform: translate3d(0, 0, 0) !important",
  "overflow-y: auto !important",
  "touch-action: pan-y !important",
  "shield-pass288-pdf-forge-scan",
  ".vlcr-pass288-pdf-forge-guide",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS288 CSS marker ${needle}`);
}

for (const needle of [
  "pdfForgeTitle",
  "data-pass288-lens-pdf-forge",
  "Velmère Cybersecurity · PDF preview signature",
  "PASS288 Lens PDF forge guide",
]) {
  if (!lens.includes(needle)) errors.push(`VelmereLensCommandRouter missing PASS288 marker ${needle}`);
}

if (!pkg.scripts?.["verify:pass288-orbit-scroll-pdf-forge"]?.includes("verify-pass288-orbit-scroll-pdf-forge-safety.mjs")) {
  errors.push("package.json missing verify:pass288-orbit-scroll-pdf-forge script");
}

if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass288-orbit-scroll-pdf-forge")) {
  errors.push("verify:shield-all missing PASS288 guard");
}

const forbidden = [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "risk-free",
  "scam confirmed",
  "fraud proven",
];
const corpus = `${gate}\n${modal}\n${lens}`.toLowerCase();
for (const phrase of forbidden) {
  if (corpus.includes(phrase)) errors.push(`forbidden overclaim/dark-pattern phrase present: ${phrase}`);
}

if (!gate.includes("%PDF-1.4") || !gate.includes("URL.revokeObjectURL") && !modal.includes("URL.revokeObjectURL")) {
  errors.push("PDF preview generation is missing PDF header or URL cleanup");
}

if (errors.length) {
  console.error("PASS288 orbit scroll PDF forge failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS288 orbit scroll PDF forge safety passed.");
