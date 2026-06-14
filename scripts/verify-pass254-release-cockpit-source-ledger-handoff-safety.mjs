import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function requireMarkers(file, markers) {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file}: missing PASS254 marker ${marker}.`);
  }
  return source;
}

try {
  const contract = requireMarkers("lib/market-integrity/vlm-brain-release-cockpit-source-ledger-handoff.ts", [
    "vlm-brain-release-cockpit-source-ledger-handoff-v1-pass254",
    "operator_release_cockpit_source_ledger_handoff",
    "PASS254_VLM_BRAIN_RELEASE_COCKPIT_SOURCE_LEDGER_HANDOFF_CONTRACT",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "browserQaRequired: true",
    "source ledger, freshness, redaction, durable snapshot, browser QA, PDF preview, wallet session and customer copy",
  ]);
  for (const lane of ["source", "freshness", "redaction", "durable_snapshot", "browser_qa", "pdf_preview", "wallet_session", "customer_copy"]) {
    if (!contract.includes(`id: "${lane}"`)) errors.push(`PASS254 handoff contract: missing lane ${lane}.`);
  }
  for (const forbidden of ["customerExportAllowed: true", "rawPayloadAllowed: true", "binaryPdfAllowed: true", "walletAccessAllowed: true", "customerCopyAllowed: true"]) {
    if (contract.includes(forbidden)) errors.push(`PASS254 handoff contract must not enable ${forbidden}.`);
  }
} catch (error) {
  errors.push(`PASS254 handoff contract guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  requireMarkers("components/market-integrity/TokenRiskModal.tsx", [
    "buildVlmBrainReleaseCockpitSourceLedgerHandoff",
    "selectedTilePass254ReleaseHandoff",
    "PASS254 marker: selected tile release handoff compresses cockpit",
    'data-vlm-pass254-release-handoff-safety="true"',
    "data-vlm-pass254-release-decision",
    "data-vlm-pass254-release-lane",
    "data-vlm-pass254-release-priority",
  ]);
} catch (error) {
  errors.push(`PASS254 TokenRiskModal guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const lens = requireMarkers("components/search/VelmereLensCommandRouter.tsx", [
    "gatesTitle",
    "pewność źródeł",
    "Quellenvertrauen",
    "source confidence",
    "PDF preview",
    "wallet/session",
    "PASS254 Lens handoff safety gates expose source confidence",
  ]);
  if (lens.includes("certyfikat bezpieczeństwa") || lens.includes("Sicherheitszertifikat") || lens.includes("safety certificate")) {
    errors.push("VelmereLensCommandRouter.tsx: Lens copy must not market a safety certificate.");
  }
} catch (error) {
  errors.push(`PASS254 Lens guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  requireMarkers("app/globals.css", [
    "PASS254 — AI Brain release cockpit source-ledger handoff safety",
    ".shield-vlm-pass254-handoff",
    ".shield-vlm-pass254-handoff-lanes",
    "data-vlm-pass254-release-priority=\"P0\"",
    "prefers-reduced-motion: reduce",
    "scrollbar-color: rgba(245, 211, 122, 0.46)",
  ]);
} catch (error) {
  errors.push(`PASS254 CSS guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const pkg = JSON.parse(read("package.json"));
  if (pkg.scripts["verify:pass254-release-cockpit-source-ledger-handoff"] !== "node scripts/verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs") {
    errors.push("package.json: missing verify:pass254-release-cockpit-source-ledger-handoff script.");
  }
  if (!pkg.scripts["verify:shield-all"]?.includes("verify:pass254-release-cockpit-source-ledger-handoff")) {
    errors.push("package.json: verify:shield-all must include PASS254 guard.");
  }
} catch (error) {
  errors.push(`PASS254 package guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  requireMarkers("scripts/vercel-preflight.mjs", [
    "PASS254 AI Brain release cockpit source-ledger handoff guard",
    "verify-pass254-release-cockpit-source-ledger-handoff-safety.mjs",
    "vlm-brain-release-cockpit-source-ledger-handoff.ts",
  ]);
} catch (error) {
  errors.push(`PASS254 preflight guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  requireMarkers("docs/progress/VELMERE_MASTER_BUILD_MAP.md", [
    "PASS254 addition — AI Brain Release Cockpit Source Ledger Handoff",
    "D15 Risk driver mapping: 82% → 83%",
    "M01 Velmère Shield Report: 72% → 74%",
    "K02 Source freshness registry: 49% → 50%",
  ]);
} catch (error) {
  errors.push(`PASS254 master map guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS254 release cockpit source-ledger handoff guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS254 release cockpit source-ledger handoff safety guard passed.");
