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
  "VlmBrainWebGLTelemetrySample",
  "showMotionQaHud",
  "NEXT_PUBLIC_VLM_BRAIN_QA_HUD",
  "data-vlm-qa-motion",
  "data-vlm-webgl-trace",
  "onTelemetry={setWebglTelemetry}",
  "data-vlm-motion-qa=\"true\"",
  "PASS206 marker: public VLM Brain hides QA/FPS/zoom HUD by default",
]);

const prototype = requireIncludes("components/market-integrity/VlmBrainWebGLPrototype.tsx", [
  "VlmBrainWebGLTelemetrySample",
  "onTelemetry?:",
  "telemetryWorstFrameMs",
  "nodeCount: nodes.length",
  "WebGL QA · DOM fallback active",
  "PASS206 marker: WebGL prototype exports per-second telemetry",
]);

requireIncludes("app/globals.css", [
  "PASS206 — AI Brain production HUD polish + gated WebGL trace QA",
  "data-vlm-qa-motion=\"false\"",
  ".shield-vlm-webgl-prototype-watermark",
  "display: none !important",
  "data-vlm-webgl-trace=\"active\"",
]);

requireIncludes("lib/market-integrity/vlm-brain-renderer-contract.ts", [
  "VLM_BRAIN_QA_HUD_FEATURE_GATE",
  "NEXT_PUBLIC_VLM_BRAIN_QA_HUD",
  "FPS, zoom and WebGL trace HUD must stay hidden",
  "PASS206 marker: QA HUD / WebGL trace",
]);

requireIncludes("lib/launch/master-build-progress-delta-pass206.ts", [
  "velmerePass206ProgressDeltas",
  "Previous → Current → Change",
  "A06",
  "D10",
  "D11",
  "D21",
  "D22",
  "J04",
  "J06",
  "PASS206 marker",
]);

requireIncludes("docs/progress/PASS206_AI_BRAIN_QA_HUD_WEBGL_TRACE.md", [
  "PASS206 — AI Brain QA HUD + WebGL Trace Gate",
  "NEXT_PUBLIC_VLM_BRAIN_QA_HUD=1",
  "PASS206 product delta: +20%",
]);

requireIncludes("docs/progress/VELMERE_MASTER_BUILD_MAP.md", [
  "PASS206 delta — AI Brain QA HUD + WebGL Trace Gate",
  "Brain telemetry / FPS QA | 58% | 64% | +6%",
  "Public VLM Brain hides FPS/zoom/WebGL watermark by default",
]);

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass206-ai-brain-qa-hud-webgl-trace"]?.includes("verify-pass206-ai-brain-qa-hud-webgl-trace-safety.mjs")) {
  errors.push("package.json: PASS206 script missing");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass206-ai-brain-qa-hud-webgl-trace")) {
  errors.push("package.json: verify:shield-all missing PASS206 guard");
}

const preflight = read("scripts/vercel-preflight.mjs");
for (const needle of ["PASS206 AI Brain QA HUD WebGL trace guard", "verify-pass206-ai-brain-qa-hud-webgl-trace-safety.mjs"]) {
  if (!preflight.includes(needle)) errors.push(`scripts/vercel-preflight.mjs: missing ${needle}`);
}

for (const forbidden of ["guaranteed profit", "risk-free investment", "enter seed phrase", "safe investment", "scam confirmed", "144fps guaranteed"]) {
  if (modal.toLowerCase().includes(forbidden) || prototype.toLowerCase().includes(forbidden)) {
    errors.push(`PASS206 UI includes forbidden phrase: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("PASS206 AI Brain QA HUD WebGL trace guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS206 AI Brain QA HUD WebGL trace guard OK");
