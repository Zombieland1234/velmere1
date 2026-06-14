import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const has = (source, token, label) => {
  if (!source.includes(token)) errors.push(`${label}: missing ${token}`);
};

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass201.ts");
const mapDoc = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const passDoc = read("docs/progress/PASS201_AI_BRAIN_INTERACTION_PORTAL.md");
const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "selectedTileDetailPortal",
  "shield-vlm-detail-portal-root",
  "document.body",
  "PASS201 marker: tile detail popup is rendered through document.body portal",
  "selectRelativeNode",
  "ArrowRight",
  "ArrowLeft",
  "Escape",
  "PASS201 marker: keyboard tile navigation uses Escape and ArrowRight/ArrowLeft",
  "autoRotate && !selectedNode ? orbitTick * 0.00042",
]) has(modal, token, "TokenRiskModal.tsx");

for (const token of [
  "PASS201 — VLM Brain tile detail body portal",
  ".shield-vlm-detail-portal-root",
  ".shield-vlm-detail-panel-portal",
  ".shield-vlm-detail-dismiss-layer-portal",
  ".shield-vlm-orbit-mode .shield-vlm-zoom-controls",
  "z-index: 2147483200",
]) has(css, token, "app/globals.css");

for (const token of [
  "PASS201 marker: AI Brain detail portal",
  "progress: 94",
  "progress: 95",
  "progress: 51",
]) has(map, token, "master-build-areas.ts");

for (const token of [
  "velmerePass201ProgressDeltas",
  "getVelmerePass201ProgressDeltaRows",
  "Previous → Current → Change",
  "D07",
  "D19",
  "D20",
  "D23",
  "J04",
  "J06",
]) has(delta, token, "master-build-progress-delta-pass201.ts");

for (const token of [
  "PASS201 delta — AI Brain Interaction Portal",
  "Tile detail popup | 91% | 94% | +3%",
  "Brain accessibility / keyboard flow | 44% | 51% | +7%",
]) has(mapDoc, token, "VELMERE_MASTER_BUILD_MAP.md");

for (const token of ["PASS201 — AI Brain Interaction Portal", "tile detail body portal", "keyboard navigation", "pause-on-read"]) has(passDoc, token, "PASS201_AI_BRAIN_INTERACTION_PORTAL.md");
for (const token of ["PASS 201", "AI Brain Interaction Portal", "Keyboard + Pause-On-Read"]) has(ledger, token, "PROJECT_PROGRESS_LEDGER.md");
for (const token of ["PASS201 marker", "vlm-brain-explainer", "ai-risk-brain"]) has(progress, token, "project-progress.ts");
for (const token of ["PASS201 audit marker", "tile detail portal"]) has(audit, token, "site-page-audit.ts");
for (const token of ["verify:pass201-ai-brain-interaction-portal", "verify-pass201-ai-brain-interaction-portal-safety.mjs"]) has(pkg, token, "package.json");
for (const token of ["PASS201 AI Brain interaction portal guard", "verify-pass201-ai-brain-interaction-portal-safety.mjs", "PASS201_AI_BRAIN_INTERACTION_PORTAL.md"]) has(preflight, token, "vercel-preflight.mjs");

const unsafe = `${modal}\n${css}\n${map}\n${delta}\n${mapDoc}\n${passDoc}\n${ledger}\n${progress}\n${audit}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal", "fraud proven"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS201 AI Brain interaction portal safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS201 AI Brain interaction portal safety OK · body portal + keyboard + pause-on-read guarded");
