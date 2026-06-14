import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const casefile = read("lib/market-integrity/operator-casefile.ts");
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");

for (const needle of [
  "export function buildShieldOperatorCaseFile",
  "ShieldOperatorCaseFile",
  "ShieldOperatorLane",
  "osintQueries",
  "operatorChecklist",
  "Not financial advice. Algorithmic risk flag only",
  "statusFrom(",
]) {
  if (!casefile.includes(needle)) errors.push(`operator-casefile missing ${needle}`);
}

for (const forbidden of [
  "fetch(",
  "window.",
  "document.",
  "localStorage",
  "as any",
  "safe investment",
  "guaranteed",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
]) {
  if (casefile.toLowerCase().includes(forbidden.toLowerCase())) {
    errors.push(`operator-casefile contains forbidden pattern ${forbidden}`);
  }
}

for (const needle of [
  "buildShieldOperatorCaseFile(result)",
  "operatorCaseFile.primaryNextAction",
  "operatorCaseFile.osintQueries[0]",
  "shield-operator-casefile",
  "shield-vlm-orbital-shell",
]) {
  if (!modal.includes(needle)) errors.push(`TokenRiskModal missing PASS126 operator/orbit marker ${needle}`);
}

for (const needle of [
  "PASS126 — operator casefile",
  ".shield-operator-casefile",
  ".shield-vlm-orbital-shell",
  "shieldVlmOrbitShell",
]) {
  if (!css.includes(needle)) errors.push(`globals.css missing PASS126 marker ${needle}`);
}

if (errors.length) {
  console.error("Operator casefile safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Operator casefile safety checks passed.");
