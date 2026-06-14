import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const casefile = read("lib/market-integrity/operator-casefile.ts");
const progress = read("lib/launch/project-progress.ts");
const css = read("app/globals.css");

for (const needle of [
  "controlBody",
  "basicHint",
  "advancedHint",
  "selectedTileEvidenceCopy",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing operator copy marker: ${needle}`);
}

if (!css.includes(".shield-token-action-panel .shield-mode-guide")) {
  errors.push("globals.css missing PASS148 hidden mode guide cleanup marker.");
}

for (const needle of [
  "low-risk pre-screen",
  "Missing sources still keep the case in review mode",
  "Low pre-screen means the current source set did not show a strong flag; it does not prove safety.",
  "Attach the source ledger, resolve missing data and rerun the prescreen.",
]) {
  if (!casefile.includes(needle)) errors.push(`operator-casefile missing clear copy marker: ${needle}`);
}

for (const needle of [
  "VelmereProjectProgressItem",
  "velmereProjectProgress",
  "velmereProjectOverallProgress",
  "checkout",
  "evidence-export",
  "launch-safety",
]) {
  if (!progress.includes(needle)) errors.push(`project-progress.ts missing matrix marker: ${needle}`);
}

for (const needle of [
  "PASS132 — operator copy clarity",
  ".shield-mode-guide",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS132 style marker: ${needle}`);
}

for (const forbidden of [
  "Low detected risk from available data",
  "safe investment",
  "guaranteed profit",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
]) {
  if ((modal + casefile).toLowerCase().includes(forbidden.toLowerCase())) {
    errors.push(`operator copy contains forbidden/old wording: ${forbidden}`);
  }
}

if (errors.length) {
  console.error("Operator copy/progress safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Operator copy/progress safety checks passed.");
