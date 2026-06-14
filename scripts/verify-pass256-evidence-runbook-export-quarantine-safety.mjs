import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

try {
  const source = read("lib/market-integrity/vlm-brain-pass256-evidence-runbook.ts");
  for (const marker of [
    "vlm-brain-pass256-evidence-runbook-v1",
    "PASS256_VLM_BRAIN_EVIDENCE_RUNBOOK_CONTRACT",
    "operator_evidence_runbook_browser_replay_quarantine",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserReplayRequired: true",
    "replayEvidenceAttached: false",
    "exportQuarantine: true",
  ]) {
    if (!source.includes(marker)) errors.push(`PASS256 evidence runbook contract: missing ${marker}.`);
  }
  for (const cell of ["public_export", "raw_payload", "binary_pdf", "wallet_access", "customer_copy"]) {
    if (!source.includes(`freezeCell(\"${cell}\"`)) errors.push(`PASS256 evidence runbook contract: missing freeze cell ${cell}.`);
  }
  for (const unsafe of ["seed phrase", "private key", "guaranteed profit", "risk-free", "buy signal", "safe investment", "guaranteed security"]) {
    if (source.toLowerCase().includes(unsafe)) errors.push(`PASS256 evidence runbook contract must avoid unsafe public wording: ${unsafe}.`);
  }
} catch (error) {
  errors.push(`PASS256 evidence runbook contract guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  for (const marker of [
    "buildVlmBrainPass256EvidenceRunbook",
    "selectedTilePass256EvidenceRunbook",
    "PASS256 marker: selected tile evidence runbook",
    'data-vlm-pass256-evidence-runbook="true"',
    "data-vlm-pass256-queue-state",
    "data-vlm-pass256-replay-state",
    "data-vlm-pass256-freeze-cell",
  ]) {
    if (!modal.includes(marker)) errors.push(`TokenRiskModal PASS256 UI missing ${marker}.`);
  }
  for (const localeMarker of ["kolejka dowodów", "Evidenz-Queue", "evidence queue"]) {
    if (!modal.includes(localeMarker)) errors.push(`TokenRiskModal PASS256 localization missing ${localeMarker}.`);
  }
} catch (error) {
  errors.push(`PASS256 TokenRiskModal guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const css = read("app/globals.css");
  for (const marker of [
    "PASS256 — AI Brain evidence runbook",
    ".shield-vlm-pass256-evidence-runbook",
    "data-vlm-pass256-queue-state",
    "data-vlm-pass256-replay-state",
    "data-vlm-pass256-freeze-cell",
    "PASS256 — Lens evidence runbook guide",
    ".vlcr-pass256-runbook-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!css.includes(marker)) errors.push(`app/globals.css: missing PASS256 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS256 CSS guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const lens = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "PASS256 Lens evidence runbook guide",
    "vlcr-pass256-runbook-guide",
    "PASS256 evidence runbook",
    "PASS256 Evidence-Runbook",
    "export quarantine",
    "Export-Quarantäne",
    "copy after review",
  ]) {
    if (!lens.includes(marker)) errors.push(`VelmereLensCommandRouter.tsx: missing PASS256 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS256 Lens guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const pkg = read("package.json");
  if (!pkg.includes("verify-pass256-evidence-runbook-export-quarantine-safety.mjs")) errors.push("package.json: missing PASS256 guard script.");
  if (!pkg.includes("verify:pass256-evidence-runbook-export-quarantine")) errors.push("package.json: missing PASS256 npm script.");
  if (!pkg.includes("verify:pass255-action-router-browser-replay-export-freeze && npm run verify:pass256-evidence-runbook-export-quarantine")) errors.push("package.json: PASS256 is not chained after PASS255 in verify:shield-all.");
} catch (error) {
  errors.push(`PASS256 package guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const preflight = read("scripts/vercel-preflight.mjs");
  for (const marker of [
    "PASS256 AI Brain evidence runbook export quarantine guard",
    "vlm-brain-pass256-evidence-runbook-v1",
    "data-vlm-pass256-evidence-runbook",
    "vlcr-pass256-runbook-guide",
  ]) {
    if (!preflight.includes(marker)) errors.push(`vercel-preflight.mjs: missing PASS256 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS256 preflight guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const progress = read("lib/launch/project-progress.ts");
  const areas = read("lib/launch/master-build-areas.ts");
  for (const marker of ["PASS256 addition — AI Brain Evidence Runbook Export Quarantine", "PASS256 marker: AI Brain Evidence Runbook active"]) {
    if (!master.includes(marker)) errors.push(`VELMERE_MASTER_BUILD_MAP.md: missing ${marker}.`);
  }
  if (!progress.includes("PASS256 marker: AI Brain Evidence Runbook")) errors.push("project-progress.ts: missing PASS256 progress marker.");
  if (!areas.includes("PASS256 marker: AI Brain Evidence Runbook Export Quarantine")) errors.push("master-build-areas.ts: missing PASS256 marker.");
} catch (error) {
  errors.push(`PASS256 progress map guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS256 evidence runbook export quarantine guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS256 evidence runbook export quarantine safety guard passed.");
