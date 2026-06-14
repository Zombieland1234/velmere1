import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const progress = read("lib/launch/project-progress.ts");
const preflight = read("scripts/vercel-preflight.mjs");

for (const needle of [
  'type BrainRuntimeMode = "cinematic" | "performance"',
  'const [brainRuntimeMode, setBrainRuntimeMode]',
  'const [frameHealth, setFrameHealth]',
  'performanceRuntime',
  'const renderHeavyCanvas = false',
  'orbitUpdateFrameMs',
  'orbitStepSize',
  'orbitTransitionMs',
  'advancedOrbitalSlots',
  'PASS150 adaptive runtime governor',
  'targetFrameMs = orbitUpdateFrameMs',
  'setBrainRuntimeMode("performance")',
  'shield-vlm-topbar-minimal',
  'shield-vlm-motion-toggle-mini',
  'shield-vlm-runtime-performance',
  'shield-vlm-static-evidence-board',
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal.tsx missing PASS150 runtime marker: ${needle}`);
}

if (modal.includes('(["orbit", "lite", "static"]') || modal.includes('motionPreset === "lite"') || modal.includes('ui.motionLite')) {
  errors.push("Lite motion preset must remain removed.");
}

if (modal.includes('targetFrameMs = motionQuality === "high" ? 24')) {
  errors.push("PASS149 high-frequency React orbit tick must be replaced by PASS150 adaptive runtime governor.");
}

for (const needle of [
  'PASS150 — VLM brain performance runtime governor',
  '.shield-vlm-motion-stack',
  '.shield-vlm-runtime-governor',
  '.shield-vlm-runtime-performance',
  '.shield-vlm-runtime-cinematic',
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS150 runtime marker: ${needle}`);
}

for (const needle of ['id: "vlm-brain-performance-runtime"', 'velmereProjectOverallProgress', 'vlm-visual-brain"', 'launch-safety"']) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing runtime progress marker: ${needle}`);
}

if (!preflight.includes("VLM brain performance runtime guard")) {
  errors.push("vercel-preflight.mjs missing PASS150 runtime guard.");
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
  "ctx.fillText(`RISK",
  "RISK ${riskScore}%",
]) {
  const haystack = `${modal}\n${css}`.toLowerCase();
  if (haystack.includes(forbidden.toLowerCase())) {
    errors.push(`PASS150 contains forbidden wording/behavior: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("VLM brain performance runtime verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("VLM brain performance runtime checks passed.");
