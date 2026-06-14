import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const gate = read("lib/market-integrity/layout-stability-sentinel-gate.ts");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));

for (const needle of [
  "buildLayoutStabilitySentinelGate",
  "layoutStabilitySentinelGate",
  "data-pass289-layout-stability-sentinel",
  "shield-pass289-layout-sentinel",
  "right-edge Orbit scroll",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS289 marker ${needle}`);
}

for (const needle of [
  "velmere_layout_stability_sentinel_gate_v1_pass289",
  "LayoutStabilitySentinelGate",
  "right-edge Orbit drawer stays scrollable",
  "anti-FOMO cooldown copy",
  "not a market signal, safety certificate or investment recommendation",
]) {
  if (!gate.includes(needle)) errors.push(`layout-stability-sentinel-gate missing marker ${needle}`);
}

for (const needle of [
  "PASS289 — layout stability sentinel",
  ".shield-pass289-layout-sentinel",
  ".shield-pass289-layout-rail-grid",
  "data-pass288-orbit-right-edge-scroll=\"true\"",
  "right: 0 !important",
  "left: auto !important",
  "overflow-y: auto !important",
  "touch-action: pan-y !important",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS289 CSS marker ${needle}`);
}

if (!pkg.scripts?.["verify:pass289-layout-stability-sentinel-gate"]?.includes("verify-pass289-layout-stability-sentinel-gate-safety.mjs")) {
  errors.push("package.json missing verify:pass289-layout-stability-sentinel-gate script");
}

if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass289-layout-stability-sentinel-gate")) {
  errors.push("verify:shield-all missing PASS289 guard");
}

const forbidden = [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "risk-free",
  "scam confirmed",
  "fraud proven",
];
const corpus = `${gate}\n${modal}`.toLowerCase();
for (const phrase of forbidden) {
  if (corpus.includes(phrase)) errors.push(`forbidden overclaim/dark-pattern phrase present: ${phrase}`);
}

if (!modal.includes("downloadEvidenceManifest") || !modal.includes("downloadVelmereCybersecurityPdf")) {
  errors.push("download handlers should remain defined after PASS289 layout pass");
}

if (errors.length) {
  console.error("PASS289 layout stability sentinel gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS289 layout stability sentinel gate safety passed.");
