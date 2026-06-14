import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

for (const file of [
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "app/globals.css",
  "lib/launch/project-progress.ts",
]) {
  if (!exists(file)) errors.push(`${file}: missing PASS149 target file.`);
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const client = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");
const progress = read("lib/launch/project-progress.ts");
const preflight = read("scripts/vercel-preflight.mjs");

for (const needle of [
  'type MotionPreset = "orbit" | "static"',
  'allowedMotionPresets',
  'const renderHeavyCanvas = false',
  'showLineSvg = false',
  'targetFrameMs = orbitUpdateFrameMs',
  'autoSpin = autoRotate ? orbitTick * 0.00058',
  'shield-vlm-detail-panel-solid',
  'operatorQuestion',
  'evidenceNeed',
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS149 marker: ${needle}`);
}
if (!(modal.includes('mode === "advanced" ? ["orbit", "static"] : ["static"]') || modal.includes('const allowedMotionPresets = useMemo<MotionPreset[]>(() => ["orbit", "static"], []);'))) {
  errors.push('TokenRiskModal.tsx missing supported allowedMotionPresets contract.');
}

if (modal.includes('"lite"') || modal.includes("'lite'") || modal.includes("| \"lite\"")) {
  errors.push("TokenRiskModal.tsx must not expose Lite as a MotionPreset.");
}

for (const needle of [
  'sourceMode?: "local" | "live" | "merged"',
  'sourceMode: "local"',
  'sourceMode: localMeta ? "merged"',
  'token suggestions · logo aware',
  'live + table',
  'click to open Shield readout',
]) {
  if (!client.includes(needle)) errors.push(`MarketIntegrityClient.tsx missing PASS149 marker: ${needle}`);
}

for (const needle of [
  "PASS149 — Advanced-only orbit guard",
  ".shield-vlm-detail-panel-solid",
  ".shield-token-search-suggest-panel",
  ".shield-suggestion-token-avatar",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS149 marker: ${needle}`);
}

for (const needle of ['id: "vlm-brain-explainer"', 'id: "search-suggestions-ux"', 'velmereProjectOverallProgress']) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing PASS149 marker: ${needle}`);
}

if (!preflight.includes("VLM brain explainer advanced guard")) {
  errors.push("vercel-preflight.mjs missing PASS149 guard.");
}

for (const forbidden of [
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
  "risk-free",
  "safe investment",
  "enter seed phrase",
  "RISK ${riskScore}%",
  "ctx.fillText(`RISK",
]) {
  const haystack = `${modal}\n${client}\n${css}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`PASS149 contains forbidden wording/behavior: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("VLM brain explainer advanced guard verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("VLM brain explainer advanced guard checks passed.");
