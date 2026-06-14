import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const contract = read("lib/launch/vlm-brain-renderer-contract.ts");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "const boardDensity = filteredVisibleNodes.length <= 2 ?",
  "shield-vlm-static-density-${boardDensity}",
  "safeTotal <= 4",
  "sparsePositions",
]) {
  if (!modal.includes(token)) errors.push(`TokenRiskModal missing PASS172 density marker: ${token}`);
}

for (const token of [
  "PASS172 · evidence board sparse/focused density polish",
  ".shield-vlm-static-density-sparse",
  ".shield-vlm-static-density-focused",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS172 density marker: ${token}`);
}

for (const token of [
  "VlmBrainRendererMode",
  "dom_orbit_360",
  "dom_evidence_board",
  "webgl_prototype",
  "getVlmBrainRendererSummary",
]) {
  if (!contract.includes(token)) errors.push(`renderer contract missing token: ${token}`);
}

if (!preflight.includes("verify-vlm-brain-board-density-renderer-contract-safety.mjs")) {
  errors.push("vercel-preflight.mjs must reference PASS172 density/renderer guard.");
}

if (errors.length) {
  console.error("PASS172 board density/renderer contract safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS172 board density/renderer contract safety OK");
