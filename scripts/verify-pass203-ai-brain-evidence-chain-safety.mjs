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
  "PASS203 marker: AI Brain detail drawer now exposes evidenceRail/confidenceRail/decisionRail and per-card source badges.",
  "tileSourceBadge",
  "shield-vlm-evidence-chain-rail",
  "shield-vlm-source-badge",
  "operatorChecklist",
  "decisionRail",
  "confidenceRail",
  "evidenceRail",
  "partial źródło · drugi proof",
  "Partial-Quelle · zweiter Proof",
  "fallback · blocks strong brief",
]);

requireIncludes("app/globals.css", [
  "PASS203 — AI Brain evidence-chain rail + per-card source badges",
  ".shield-vlm-evidence-chain-rail",
  ".shield-vlm-operator-checklist",
  ".shield-vlm-source-badge-live",
  ".shield-vlm-source-badge-partial",
  ".shield-vlm-source-badge-fallback",
]);

requireIncludes("lib/launch/master-build-progress-delta-pass203.ts", [
  "velmerePass203ProgressDeltas",
  "Previous → Current → Change",
  "D15",
  "D16",
  "D17",
  "D23",
  "D24",
  "PASS203 marker: AI Brain evidence-chain rail",
]);

requireIncludes("docs/progress/PASS203_AI_BRAIN_EVIDENCE_CHAIN.md", [
  "PASS203 — AI Brain Evidence Chain Rail",
  "per-card source badges",
  "decision rail",
  "operator checklist",
]);

requireIncludes("docs/progress/VELMERE_MASTER_BUILD_MAP.md", [
  "PASS203 delta — AI Brain Evidence Chain Rail",
  "Risk driver mapping | 58% | 62% | +4%",
  "Source confidence lanes | 57% | 61% | +4%",
]);

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:pass203-ai-brain-evidence-chain"]?.includes("verify-pass203-ai-brain-evidence-chain-safety.mjs")) {
  errors.push("package.json: verify:pass203-ai-brain-evidence-chain script missing");
}
if (!pkg.scripts?.["verify:shield-all"]?.includes("verify:pass203-ai-brain-evidence-chain")) {
  errors.push("package.json: verify:shield-all does not include PASS203 guard");
}

const preflight = read("scripts/vercel-preflight.mjs");
for (const needle of ["PASS203 AI Brain evidence-chain guard", "verify-pass203-ai-brain-evidence-chain-safety.mjs"]) {
  if (!preflight.includes(needle)) errors.push(`scripts/vercel-preflight.mjs: missing ${needle}`);
}

for (const forbidden of ["guaranteed profit", "risk-free investment", "enter seed phrase", "safe investment", "scam confirmed"]) {
  if (modal.toLowerCase().includes(forbidden)) errors.push(`TokenRiskModal includes forbidden overclaim/unsafe phrase: ${forbidden}`);
}

if (errors.length) {
  console.error("PASS203 AI Brain evidence-chain guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS203 AI Brain evidence-chain guard OK");
