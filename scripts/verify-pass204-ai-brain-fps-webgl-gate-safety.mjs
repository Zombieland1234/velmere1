import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const requireIncludes = (file, needles) => {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) errors.push(`${file}: missing ${needle}`);
  }
  return source;
};

const modal = requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
  "PASS204 marker: AI Brain uses lightweight FPS telemetry, selected-tile reading pause and a WebGL migration gate without enabling a heavy renderer.",
  "type MotionTelemetryState",
  "motionTelemetry",
  "PASS204 FPS telemetry: one lightweight rAF sampler, one state update per second.",
  "document.visibilityState === \"visible\" && !selectedNode",
  "shield-vlm-motion-health-chip",
  "ui.motionHealth",
  "inputLatency",
]);

requireIncludes("app/globals.css", [
  "PASS204 — AI Brain FPS telemetry chip + reading-pause governor",
  ".shield-vlm-motion-health-chip",
  ".shield-vlm-motion-health-stable",
  ".shield-vlm-motion-health-throttled",
]);

requireIncludes("lib/market-integrity/vlm-brain-renderer-contract.ts", [
  "VLM_BRAIN_WEBGL_FEATURE_GATE",
  "VLM_BRAIN_RENDERER_CONTRACT",
  "resolveVlmBrainRendererGate",
  "DOM Orbit 360 remains the safe fallback",
  "PASS204 marker: WebGL migration gate is typed, feature-gated and keeps DOM Orbit as fallback.",
]);

requireIncludes("lib/launch/master-build-progress-delta-pass204.ts", [
  "velmerePass204ProgressDeltas",
  "Previous → Current → Change",
  "D09",
  "D10",
  "D11",
  "D21",
  "D22",
  "J06",
  "PASS204 marker: AI Brain FPS telemetry",
]);

requireIncludes("docs/progress/PASS204_AI_BRAIN_FPS_WEBGL_GATE.md", [
  "PASS204 — AI Brain FPS Telemetry + WebGL Gate",
  "PASS204 product delta: +23%",
  "DOM Orbit remains the production fallback",
]);

requireIncludes("docs/progress/VELMERE_MASTER_BUILD_MAP.md", [
  "PASS204 delta — AI Brain FPS Telemetry + WebGL Gate",
  "Brain telemetry / FPS QA | 48% | 55% | +7%",
  "WebGL migration contract | 40% | 46% | +6%",
]);

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass204-ai-brain-fps-webgl-gate"]?.includes("verify-pass204-ai-brain-fps-webgl-gate-safety.mjs")) {
  errors.push("package.json: verify:pass204-ai-brain-fps-webgl-gate script missing");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass204-ai-brain-fps-webgl-gate")) {
  errors.push("package.json: verify:shield-all does not include PASS204 guard");
}

const preflight = read("scripts/vercel-preflight.mjs");
for (const needle of ["PASS204 AI Brain FPS/WebGL gate guard", "verify-pass204-ai-brain-fps-webgl-gate-safety.mjs"]) {
  if (!preflight.includes(needle)) errors.push(`scripts/vercel-preflight.mjs: missing ${needle}`);
}

for (const forbidden of ["guaranteed profit", "risk-free investment", "enter seed phrase", "safe investment", "scam confirmed", "144fps guaranteed"]) {
  if (modal.toLowerCase().includes(forbidden)) errors.push(`TokenRiskModal includes forbidden overclaim/unsafe phrase: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS204 AI Brain FPS/WebGL gate guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS204 AI Brain FPS/WebGL gate guard OK");
