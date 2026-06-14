import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const marketClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "shield-vlm-topbar-minimal",
  "shield-vlm-brain-chip",
  "ui.brainChip",
  "useStaticEvidenceBoard",
  "shield-vlm-static-evidence-board",
  "shield-vlm-static-card-grid",
  "shield-vlm-static-card",
  "setSelectedNode(node)",
  "selectedNode.detail",
  "selectedTileEvidenceCopy?.scoreRead",
  "selectedTileEvidenceCopy?.evidenceNeed",
  "selectedTileEvidenceCopy?.next",
]) {
  if (!modal.includes(token) && !css.includes(token)) {
    errors.push(`Missing VLM brain polish token: ${token}`);
  }
}

for (const token of [
  "const renderHeavyCanvas = false",
  "Advanced Orbit 360 renders orbital cards",
  "autoSpin = autoRotate ? orbitTick * 0.00058",
  "orbitUpdateFrameMs = performanceRuntime ? 180 : 116",
  "shield-vlm-read-card-advanced",
]) {
  if (!modal.includes(token) && !css.includes(token)) {
    errors.push(`Missing Advanced performance/orbit token: ${token}`);
  }
}

for (const forbidden of [
  "adaptive orbital risk sphere",
  "sparse react frames",
  "compositor motion",
  "shield-vlm-runtime-governor\" aria-label",
  "ctx.fillText(`RISK",
  "RISK ${riskScore}%",
  "buy signal",
  "sell signal",
  "guaranteed profit",
  "risk-free",
  "safe investment",
  "scam confirmed",
  "fraud proven",
  "enter seed phrase",
]) {
  if (`${modal}\n${css}`.toLowerCase().includes(forbidden.toLowerCase())) {
    errors.push(`Forbidden/debug wording remains visible or executable: ${forbidden}`);
  }
}

for (const token of [
  "TokenAvatar image={item.image}",
  "item.sourceMode === \"local\" ? \"table\"",
  "live + table",
  "z-[10000]",
]) {
  if (!marketClient.includes(token)) errors.push(`Search suggestion UX missing token: ${token}`);
}

if (!css.includes("z-index: 2147483000")) {
  errors.push("Search suggestions need a high z-index containment override.");
}

if (!preflight.includes("verify-vlm-brain-static-advanced-polish-safety.mjs")) {
  errors.push("vercel-preflight.mjs must reference the PASS168 VLM brain polish guard.");
}

if (errors.length) {
  console.error("VLM brain static/advanced polish verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("VLM brain static/advanced polish checks passed.");
