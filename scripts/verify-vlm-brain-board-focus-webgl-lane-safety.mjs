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

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const webglPath = "components/market-integrity/VlmBrainWebGLPrototype.tsx";
const webgl = exists(webglPath) ? read(webglPath) : "";
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "shield-vlm-board-mode",
  "shield-vlm-orbit-mode",
  "staticBoardRingName",
  "staticBoardTileStyle",
  "shield-vlm-static-map-rings",
  "shield-vlm-static-card-outer",
]) {
  if (!modal.includes(token) && !css.includes(token)) errors.push(`Missing PASS171 board marker: ${token}`);
}

if (modal.includes("shield-vlm-static-core-label") || modal.includes("shield-vlm-static-core-symbol")) {
  errors.push("Static board must not render duplicate VLM core labels.");
}

for (const token of [
  "PASS171 · evidence board focus polish",
  ".shield-vlm-board-mode .shield-vlm-dom-core",
  ".shield-vlm-static-map-ring-a",
  ".shield-vlm-static-card-outer",
]) {
  if (!css.includes(token)) errors.push(`Missing PASS171 CSS marker: ${token}`);
}

for (const token of [
  "PASS171 WebGL-ready lane",
  "data-webgl-prototype=\"vlm-brain\"",
  "canvas.getContext(\"webgl\"",
  "powerPreference: \"high-performance\"",
]) {
  if (!webgl.includes(token)) errors.push(`Missing WebGL prototype marker: ${token}`);
}

if (webgl.includes("from \"three\"") || webgl.includes("from 'three'")) {
  errors.push("WebGL prototype must not import three.js in this pass.");
}

if (modal.includes("VlmBrainWebGLPrototype")) {
  const pass205SafeMount =
    modal.includes("PASS205 marker: VLM Brain mounts an isolated feature-gated WebGL prototype layer") &&
    webgl.includes("NEXT_PUBLIC_VLM_BRAIN_RENDERER") &&
    webgl.includes("resolveVlmBrainRendererGate") &&
    webgl.includes("if (!enabled) return null") &&
    webgl.includes("DOM fallback active");
  if (!pass205SafeMount) {
    errors.push("WebGL prototype can only be imported after PASS205 if it is feature-gated and keeps DOM Orbit fallback active.");
  }
}

if (!preflight.includes("verify-vlm-brain-board-focus-webgl-lane-safety.mjs")) {
  errors.push("vercel-preflight.mjs must reference PASS171 board/WebGL guard.");
}

if (errors.length) {
  console.error("PASS171 board/WebGL lane safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS171 board/WebGL lane safety OK");
// PASS205 compatibility marker: feature-gated VlmBrainWebGLPrototype imports are allowed only when DOM Orbit fallback remains active.
