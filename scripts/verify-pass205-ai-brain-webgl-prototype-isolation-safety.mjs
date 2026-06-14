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

const prototype = requireIncludes("components/market-integrity/VlmBrainWebGLPrototype.tsx", [
  "PASS205 marker: isolated WebGL prototype renderer",
  "NEXT_PUBLIC_VLM_BRAIN_RENDERER",
  "resolveVlmBrainRendererGate",
  "getContext(\"webgl\"",
  "requestAnimationFrame",
  "data-vlm-renderer-status",
  "DOM fallback active",
]);

requireIncludes("components/market-integrity/TokenRiskModal.tsx", [
  "VlmBrainWebGLPrototype",
  "PASS205 marker: VLM Brain mounts an isolated feature-gated WebGL prototype layer",
  "paused={Boolean(selectedNode)}",
  "quality={motionQuality}",
]);

requireIncludes("app/globals.css", [
  "PASS205 — AI Brain isolated WebGL prototype layer",
  ".shield-vlm-webgl-prototype-layer",
  ".shield-vlm-webgl-prototype-canvas",
  ".shield-vlm-webgl-prototype-watermark",
  "prefers-reduced-motion: reduce",
]);

requireIncludes("lib/market-integrity/vlm-brain-renderer-contract.ts", [
  "prototypeRules",
  "PASS205 WebGL prototype must be isolated",
  "PASS205 marker: WebGL prototype layer can mount",
  "keepsDomFallback: true",
]);

requireIncludes("lib/launch/master-build-progress-delta-pass205.ts", [
  "velmerePass205ProgressDeltas",
  "Previous → Current → Change",
  "D09",
  "D10",
  "D11",
  "D21",
  "D22",
  "J06",
  "PASS205 marker",
]);

requireIncludes("docs/progress/PASS205_AI_BRAIN_WEBGL_PROTOTYPE_ISOLATION.md", [
  "PASS205 — AI Brain WebGL Prototype Isolation",
  "NEXT_PUBLIC_VLM_BRAIN_RENDERER=webgl-prototype",
  "PASS205 product delta: +22%",
]);

requireIncludes("docs/progress/VELMERE_MASTER_BUILD_MAP.md", [
  "PASS205 delta — AI Brain WebGL Prototype Isolation",
  "WebGL / Three.js lane | 42% | 49% | +7%",
  "WebGL migration contract | 46% | 54% | +8%",
]);

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass205-ai-brain-webgl-prototype-isolation"]?.includes("verify-pass205-ai-brain-webgl-prototype-isolation-safety.mjs")) {
  errors.push("package.json: PASS205 script missing");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass205-ai-brain-webgl-prototype-isolation")) {
  errors.push("package.json: verify:shield-all missing PASS205 guard");
}

const preflight = read("scripts/vercel-preflight.mjs");
for (const needle of ["PASS205 AI Brain WebGL prototype isolation guard", "verify-pass205-ai-brain-webgl-prototype-isolation-safety.mjs"]) {
  if (!preflight.includes(needle)) errors.push(`scripts/vercel-preflight.mjs: missing ${needle}`);
}

for (const forbidden of ["guaranteed profit", "risk-free investment", "enter seed phrase", "safe investment", "scam confirmed", "144fps guaranteed"]) {
  if (prototype.toLowerCase().includes(forbidden)) errors.push(`WebGL prototype includes forbidden phrase: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS205 AI Brain WebGL prototype isolation guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS205 AI Brain WebGL prototype isolation guard OK");
