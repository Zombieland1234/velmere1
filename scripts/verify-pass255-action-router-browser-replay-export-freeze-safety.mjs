import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

try {
  const source = read("lib/market-integrity/vlm-brain-pass255-action-router.ts");
  for (const marker of [
    "vlm-brain-pass255-action-router-v1",
    "PASS255_VLM_BRAIN_ACTION_ROUTER_CONTRACT",
    "operator_action_router_browser_replay_export_freeze",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exportFreeze: true",
    "walletSecretAllowed: false",
    "browserReplayRequired: true",
  ]) {
    if (!source.includes(marker)) errors.push(`PASS255 action router contract: missing ${marker}.`);
  }
  for (const phase of ["evidence_intake", "browser_replay", "export_freeze", "access_copy"]) {
    if (!source.includes(`id: \"${phase}\"`)) errors.push(`PASS255 action router contract: missing phase ${phase}.`);
  }
  for (const forbidden of ["seed phrase", "private key", "guaranteed profit", "risk-free", "buy signal", "safe investment", "certificate"]) {
    if (source.toLowerCase().includes(forbidden)) errors.push(`PASS255 action router contract must avoid unsafe public wording: ${forbidden}.`);
  }
} catch (error) {
  errors.push(`PASS255 action router contract guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  for (const marker of [
    "buildVlmBrainPass255ActionRouter",
    "selectedTilePass255ActionRouter",
    "PASS255 marker: selected tile action router",
    'data-vlm-pass255-action-router="true"',
    "data-vlm-pass255-action-phase",
    "data-vlm-pass255-replay-artifact",
  ]) {
    if (!modal.includes(marker)) errors.push(`TokenRiskModal PASS255 UI missing ${marker}.`);
  }
  for (const localeMarker of ["kolejność pracy", "Arbeitsreihenfolge", "work order"]) {
    if (!modal.includes(localeMarker)) errors.push(`TokenRiskModal PASS255 localization missing ${localeMarker}.`);
  }
} catch (error) {
  errors.push(`PASS255 TokenRiskModal guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const css = read("app/globals.css");
  for (const marker of [
    "PASS255 — AI Brain action router",
    ".shield-vlm-pass255-action-router",
    "data-vlm-pass255-action-phase",
    "data-vlm-pass255-replay-artifact",
    "PASS255 — Lens action-router guide",
    ".vlcr-pass255-action-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!css.includes(marker)) errors.push(`app/globals.css: missing PASS255 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS255 CSS guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const lens = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "PASS255 Lens action router guide",
    "vlcr-pass255-action-guide",
    "evidence intake",
    "Browser-Replay",
    "Export-Freeze",
    "access/copy review",
    "Velmère Report-Kapsel",
  ]) {
    if (!lens.includes(marker)) errors.push(`VelmereLensCommandRouter.tsx: missing PASS255 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS255 Lens guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const pkg = read("package.json");
  if (!pkg.includes("verify-pass255-action-router-browser-replay-export-freeze-safety.mjs")) errors.push("package.json: missing PASS255 guard script.");
  if (!pkg.includes("verify:pass255-action-router-browser-replay-export-freeze")) errors.push("package.json: missing PASS255 npm script.");
} catch (error) {
  errors.push(`PASS255 package guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const preflight = read("scripts/vercel-preflight.mjs");
  for (const marker of [
    "PASS255 AI Brain action router browser replay export freeze guard",
    "vlm-brain-pass255-action-router-v1",
    "data-vlm-pass255-action-router",
    "vlcr-pass255-action-guide",
  ]) {
    if (!preflight.includes(marker)) errors.push(`vercel-preflight.mjs: missing PASS255 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS255 preflight guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const progress = read("lib/launch/project-progress.ts");
  for (const marker of ["PASS255 addition — AI Brain Action Router Browser Replay Export Freeze", "PASS255 marker: AI Brain Action Router active"]) {
    if (!master.includes(marker)) errors.push(`VELMERE_MASTER_BUILD_MAP.md: missing ${marker}.`);
  }
  if (!progress.includes("PASS255 marker: AI Brain Action Router")) errors.push("project-progress.ts: missing PASS255 progress marker.");
} catch (error) {
  errors.push(`PASS255 progress map guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS255 action router browser replay export freeze guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS255 action router browser replay export freeze safety guard passed.");
