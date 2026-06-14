import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");

for (const needle of [
  "requestAnimationFrame(tick)",
  "targetFrameMs",
  "stepSize",
  "Math.max(7, Math.min(93",
  "shield-vlm-static-board",
  "shield-vlm-detail-panel-side",
  "shield-token-review-tools-hidden",
  "selectedTileEvidenceCopy",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS131 marker ${needle}`);
}

for (const needle of [
  "PASS131 — orbit layout cleanup",
  ".shield-vlm-static-board",
  ".shield-vlm-detail-panel-side",
  ".shield-token-review-tools-hidden",
  "transition-duration: 42ms",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS131 marker ${needle}`);
}

if (modal.includes('const cadence = motionPreset === "lite" ? 620') || modal.includes('return () => window.clearInterval(timer);\n  }, [isInvestigationMode, motionPreset, motionQuality, useRailLayout]);')) {
  errors.push("VLM orbit still uses old stepped setInterval ticker.");
}

if (errors.length) {
  console.error("Orbit layout cleanup safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Orbit layout cleanup safety checks passed.");
