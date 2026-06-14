import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const modalPath = path.join(root, "components/market-integrity/TokenRiskModal.tsx");
const source = fs.readFileSync(modalPath, "utf8");
const errors = [];

const forbidden = [
  ["RISK ${riskScore}%", "Duplicated risk score under the VLM orb must not return."],
  ["ctx.fillText(`RISK", "Canvas risk text under the VLM orb must not return."],
  ["Math.random()", "VLM brain graph should use deterministic seeded randomness, not Math.random()."],
  ["safeTileIndex", "Old tile index workaround should not return; use typed placement helper."],
  ["((index % 5)", "Old undefined index transform bug must not return."],
  ["(index % 4)", "Old undefined index transform bug must not return."],
  ["risk extraction", "Old duplicate risk extraction copy must not return."],
  ["odczyt ryzyka", "Old duplicate Polish risk copy must not return."],
];

for (const [needle, message] of forbidden) {
  if (source.includes(needle)) errors.push(message);
}

for (const needle of [
  "type VlmAiSequenceMode = \"basic\" | \"pro\" | \"advanced\"",
  "isInvestigationMode",
  "advancedOrbitalSlots",
  "setOrbitTick",
  "shield-vlm-brain-chip",
  "runVlmAiSequence(\"pro\")",
  "const isActive = selectedNode?.label === node.label",
]) {
  if (!source.includes(needle)) errors.push(`PASS125 VLM spherical brain marker missing: ${needle}`);
}

const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
for (const needle of [
  "PASS125 — real VLM spherical orbit layer",
  "shield-vlm-orbit-status",
  "perspective: 2100px",
  "PASS127 — clean chart surface",
]) {
  if (!css.includes(needle)) errors.push(`PASS125 VLM spherical CSS marker missing: ${needle}`);
}

const required = [
  ["maxAnimationLife", "Canvas animation should have a hard max lifetime."],
  ["idleFrameBudget", "Canvas animation should slow down after the readout is complete."],
  ["randomFrom", "VLM brain should use deterministic seeded graph generation."],
  ["advancedTileStyle", "Advanced tiles should use the typed 3D cockpit placement helper."],
  ["shield-vlm-tile-anchor", "Advanced tile anchors should be present to control 3D placement and overlap."],
  ["aria-hidden=\"true\"", "Canvas should be hidden from screen readers."],
  ["prefers-reduced-motion: reduce", "Reduced-motion mode should be respected."],
  ["cancelAnimationFrame(raf)", "Visibility cleanup must cancel animation frames."],
];

for (const [needle, message] of required) {
  if (!source.includes(needle)) errors.push(message);
}

if (!/const packetTarget = reducedMotion \? 0 : isAdvanced \? \(isLow \? 0 : isMedium \? 1 : 1\)/.test(source)) {
  errors.push("PASS127 advanced packet count should stay ultra-capped for smoother spherical orbit performance.");
}

if (!/const nodeTarget = reducedMotion \? 3 : isAdvanced \? \(isLow \? 3 : isMedium \? 4 : 5\)/.test(source)) {
  errors.push("PASS127 advanced node count should stay ultra-capped for smoother spherical orbit performance.");
}

if (source.includes("drag chart · history") || source.includes("<ChartPanControls")) {
  errors.push("PASS127 chart debug pan controls must stay removed from the user-facing chart.");
}

for (const needle of ["window.setInterval", "document.visibilityState", "memory <= 4", "no heavy render"]) {
  if (!source.includes(needle)) errors.push(`PASS149 motion guard marker missing: ${needle}`);
}

if (errors.length) {
  console.error("VLM brain performance guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("VLM brain performance checks passed.");
