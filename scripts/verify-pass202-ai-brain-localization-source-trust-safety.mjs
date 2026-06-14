import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const has = (source, token, label) => {
  if (!source.includes(token)) errors.push(`${label}: missing ${token}`);
};

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const map = read("lib/launch/master-build-areas.ts");
const delta = read("lib/launch/master-build-progress-delta-pass202.ts");
const mapDoc = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
const passDoc = read("docs/progress/PASS202_AI_BRAIN_LOCALIZATION_SOURCE_TRUST.md");
const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
const progress = read("lib/launch/project-progress.ts");
const audit = read("lib/launch/site-page-audit.ts");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");

for (const token of [
  "Live-Quelle",
  "kein Sicherheitszertifikat",
  "Ausstieg ohne starken Slippage",
  "Publikationsstatus",
  "sourceTrust",
  "publicationState",
  "previousTile",
  "nextTile",
  "keyboardHint",
  "selectRelativeNode(-1)",
  "selectRelativeNode(1)",
]) has(modal, token, "TokenRiskModal.tsx");

for (const token of [
  "PASS202 — AI Brain localized detail navigator",
  ".shield-vlm-detail-action-row",
  ".shield-vlm-detail-action-row button:hover",
]) has(css, token, "app/globals.css");

for (const token of [
  "pass202AiBrainLocalization: true",
  "PASS202 marker: AI Brain detail drawer localized PL/EN/DE",
  "progress: 91",
  "progress: 57",
  "progress: 66",
  "progress: 80",
]) has(map, token, "master-build-areas.ts");

for (const token of [
  "velmerePass202ProgressDeltas",
  "getVelmerePass202ProgressDeltaRows",
  "AI Brain Localization + Source Trust Drawer",
  "D14",
  "D16",
  "D17",
  "D24",
  "Previous → Current → Change",
]) has(delta, token, "master-build-progress-delta-pass202.ts");

for (const token of [
  "PASS202 delta — AI Brain Localization + Source Trust Drawer",
  "Brain copy localization PL/EN/DE | 72% | 80% | +8%",
  "source-trust state",
]) has(mapDoc, token, "VELMERE_MASTER_BUILD_MAP.md");

for (const token of [
  "PASS202 — AI Brain Localization + Source Trust Drawer",
  "source-trust",
  "publication-state",
  "Previous / Next tile",
]) has(passDoc, token, "PASS202_AI_BRAIN_LOCALIZATION_SOURCE_TRUST.md");

for (const token of ["PASS 202", "Brain copy localization PL/EN/DE", "Source confidence lanes"]) has(ledger, token, "PROJECT_PROGRESS_LEDGER.md");
for (const token of ["PASS202 marker", "source-trust drawer", "D14/D16/D17/D23/D24"]) has(progress, token, "project-progress.ts");
for (const token of ["PASS202 audit marker", "source-trust", "publication-state"]) has(audit, token, "site-page-audit.ts");
for (const token of ["verify:pass202-ai-brain-localization-source-trust", "verify-pass202-ai-brain-localization-source-trust-safety.mjs"]) has(pkg, token, "package.json");
for (const token of ["PASS202 AI Brain localization/source trust guard", "verify-pass202-ai-brain-localization-source-trust-safety.mjs"]) has(preflight, token, "vercel-preflight.mjs");

const unsafe = `${modal}\n${css}\n${map}\n${delta}\n${mapDoc}\n${passDoc}\n${ledger}\n${progress}\n${audit}`.toLowerCase();
for (const word of ["guaranteed profit", "risk-free", "safe investment", "scam confirmed", "enter seed phrase", "buy signal", "sell signal", "fraud proven"]) {
  if (unsafe.includes(word)) errors.push(`Forbidden wording found: ${word}`);
}

if (errors.length) {
  console.error("PASS202 AI Brain localization/source trust safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS202 AI Brain localization/source trust safety OK · localized drawer + source trust + publication state guarded");
