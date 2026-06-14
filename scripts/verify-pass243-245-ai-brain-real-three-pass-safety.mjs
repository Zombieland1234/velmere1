import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const errors = [];

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const preflight = read("scripts/vercel-preflight.mjs");
const requiredFiles = [
  "lib/market-integrity/vlm-brain-release-triage-board.ts",
  "lib/market-integrity/vlm-brain-operator-handoff-vault.ts",
  "lib/market-integrity/vlm-brain-browser-replay-script.ts",
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: missing PASS243-PASS245 implementation file.`);
}

const triage = read("lib/market-integrity/vlm-brain-release-triage-board.ts");
const vault = read("lib/market-integrity/vlm-brain-operator-handoff-vault.ts");
const replay = read("lib/market-integrity/vlm-brain-browser-replay-script.ts");

for (const marker of [
  "buildVlmBrainReleaseTriageBoard",
  "selectedTileReleaseTriageBoard",
  'data-vlm-release-triage-board="pass243"',
  "PASS243 marker",
]) {
  if (!modal.includes(marker)) errors.push(`TokenRiskModal.tsx: missing PASS243 marker ${marker}`);
}
for (const marker of [
  "buildVlmBrainOperatorHandoffVault",
  "selectedTileOperatorHandoffVault",
  'data-vlm-operator-handoff-vault="pass244"',
  "PASS244 marker",
]) {
  if (!modal.includes(marker)) errors.push(`TokenRiskModal.tsx: missing PASS244 marker ${marker}`);
}
for (const marker of [
  "buildVlmBrainBrowserReplayScript",
  "selectedTileBrowserReplayScript",
  'data-vlm-browser-replay-script="pass245"',
  "PASS245 marker",
]) {
  if (!modal.includes(marker)) errors.push(`TokenRiskModal.tsx: missing PASS245 marker ${marker}`);
}

for (const marker of [
  "VlmBrainReleaseTriageBoard",
  "vlm-brain-release-triage-board-v1-pass243",
  "operator_release_triage_preview",
  "PASS243_VLM_BRAIN_RELEASE_TRIAGE_BOARD_CONTRACT",
  "customerExportReady: false",
  "binaryPdfReady: false",
  "walletAccessReady: false",
  "rawPayloadAllowed: false",
]) {
  if (!triage.includes(marker)) errors.push(`vlm-brain-release-triage-board.ts: missing marker ${marker}`);
}
for (const marker of [
  "VlmBrainOperatorHandoffVault",
  "vlm-brain-operator-handoff-vault-v1-pass244",
  "operator_handoff_preview_no_pii",
  "PASS244_VLM_BRAIN_OPERATOR_HANDOFF_VAULT_CONTRACT",
  "sourceSnapshotWriteReady: false",
  "caseTimelineWriteReady: false",
  "customerExportReady: false",
  "rawPayloadAllowed: false",
]) {
  if (!vault.includes(marker)) errors.push(`vlm-brain-operator-handoff-vault.ts: missing marker ${marker}`);
}
for (const marker of [
  "VlmBrainBrowserReplayScript",
  "vlm-brain-browser-replay-script-v1-pass245",
  "manual_vercel_browser_replay_required",
  "PASS245_VLM_BRAIN_BROWSER_REPLAY_SCRIPT_CONTRACT",
  "qaHudRequired: true",
  "customerExportReady: false",
  "binaryPdfReady: false",
]) {
  if (!replay.includes(marker)) errors.push(`vlm-brain-browser-replay-script.ts: missing marker ${marker}`);
}

for (const marker of [
  "PASS243–PASS245 — AI Brain real three-pass release triage",
  ".shield-vlm-pass243-245-panel",
  "data-vlm-release-triage-lane",
  "data-vlm-handoff-vault-entry",
  "data-vlm-browser-replay-step",
]) {
  if (!css.includes(marker)) errors.push(`globals.css: missing PASS243-PASS245 CSS marker ${marker}`);
}

for (const marker of [
  "verify:pass243-245-ai-brain-real-three-pass",
  "verify-pass243-245-ai-brain-real-three-pass-safety.mjs",
]) {
  if (!pkg.includes(marker) && !preflight.includes(marker)) errors.push(`package/preflight: missing marker ${marker}`);
}

const forbidden = [/guaranteed\s+profit/i, /risk[-\s]?free/i, /safe\s+investment/i, /buy\s+signal/i, /sell\s+signal/i, /scam\s+confirmed/i, /fraud\s+proven/i];
for (const [name, source] of [["triage", triage], ["vault", vault], ["replay", replay]]) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) errors.push(`${name}: forbidden public wording matched ${pattern}`);
  }
}

if (errors.length) {
  console.error("PASS243-PASS245 AI Brain real three-pass guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("PASS243-PASS245 AI Brain real three-pass guard passed.");
