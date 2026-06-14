import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

try {
  const source = read("lib/market-integrity/vlm-brain-pass257-evidence-sla-timeline.ts");
  for (const marker of [
    "vlm-brain-pass257-evidence-sla-timeline-v1",
    "PASS257_VLM_BRAIN_EVIDENCE_SLA_TIMELINE_CONTRACT",
    "operator_evidence_sla_timeline_exception_firewall",
    "publicExportAllowed: false",
    "rawPayloadAllowed: false",
    "binaryPdfAllowed: false",
    "walletAccessAllowed: false",
    "customerCopyAllowed: false",
    "exceptionOverrideAllowed: false",
    "releaseFreezeActive: true",
  ]) {
    if (!source.includes(marker)) errors.push(`PASS257 evidence SLA timeline contract: missing ${marker}.`);
  }
  for (const cell of ["public_export", "raw_payload", "binary_pdf", "wallet_access", "customer_copy", "release_override"]) {
    if (!source.includes(`exceptionCell(\"${cell}\"`)) errors.push(`PASS257 exception firewall: missing ${cell}.`);
  }
  for (const unsafe of ["seed phrase", "private key", "guaranteed profit", "risk-free", "buy signal", "safe investment", "guaranteed security", "certificate"]) {
    if (source.toLowerCase().includes(unsafe)) errors.push(`PASS257 contract must avoid unsafe public wording: ${unsafe}.`);
  }
} catch (error) {
  errors.push(`PASS257 evidence SLA timeline contract guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const modal = read("components/market-integrity/TokenRiskModal.tsx");
  for (const marker of [
    "buildVlmBrainPass257EvidenceSlaTimeline",
    "selectedTilePass257EvidenceSlaTimeline",
    "PASS257 marker: selected tile evidence SLA timeline",
    'data-vlm-pass257-evidence-sla-timeline="true"',
    "data-vlm-pass257-sla-tier",
    "data-vlm-pass257-exception-firewall",
    "Evidence SLA timeline",
    "Evidence-SLA-Timeline",
  ]) {
    if (!modal.includes(marker)) errors.push(`TokenRiskModal PASS257 UI missing ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS257 TokenRiskModal guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const css = read("app/globals.css");
  for (const marker of [
    "PASS257 — AI Brain evidence SLA timeline",
    ".shield-vlm-pass257-evidence-sla",
    "data-vlm-pass257-sla-tier",
    "data-vlm-pass257-exception-firewall",
    "PASS257 — Lens evidence SLA timeline guide",
    ".vlcr-pass257-sla-guide",
    "prefers-reduced-motion: reduce",
  ]) {
    if (!css.includes(marker)) errors.push(`app/globals.css: missing PASS257 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS257 CSS guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const lens = read("components/search/VelmereLensCommandRouter.tsx");
  for (const marker of [
    "PASS257 Lens evidence SLA timeline guide",
    "vlcr-pass257-sla-guide",
    "PASS257 evidence SLA timeline",
    "PASS257 Evidence-SLA-Timeline",
    "exception firewall",
    "Exception-Firewall",
    "owner escalation",
  ]) {
    if (!lens.includes(marker)) errors.push(`VelmereLensCommandRouter.tsx: missing PASS257 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS257 Lens guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const pkg = read("package.json");
  if (!pkg.includes("verify-pass257-evidence-sla-timeline-exception-firewall-safety.mjs")) errors.push("package.json: missing PASS257 guard script.");
  if (!pkg.includes("verify:pass257-evidence-sla-timeline-exception-firewall")) errors.push("package.json: missing PASS257 npm script.");
  if (!pkg.includes("verify:pass256-evidence-runbook-export-quarantine && npm run verify:pass257-evidence-sla-timeline-exception-firewall")) errors.push("package.json: PASS257 is not chained after PASS256 in verify:shield-all.");
} catch (error) {
  errors.push(`PASS257 package guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const preflight = read("scripts/vercel-preflight.mjs");
  for (const marker of [
    "PASS257 AI Brain evidence SLA timeline exception firewall guard",
    "vlm-brain-pass257-evidence-sla-timeline-v1",
    "data-vlm-pass257-evidence-sla-timeline",
    "vlcr-pass257-sla-guide",
  ]) {
    if (!preflight.includes(marker)) errors.push(`vercel-preflight.mjs: missing PASS257 marker ${marker}.`);
  }
} catch (error) {
  errors.push(`PASS257 preflight guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const master = read("docs/progress/VELMERE_MASTER_BUILD_MAP.md");
  const progress = read("lib/launch/project-progress.ts");
  const areas = read("lib/launch/master-build-areas.ts");
  const ledger = read("docs/progress/PROJECT_PROGRESS_LEDGER.md");
  for (const marker of ["PASS257 addition — AI Brain Evidence SLA Timeline Exception Firewall", "PASS257 marker: AI Brain Evidence SLA Timeline active"]) {
    if (!master.includes(marker)) errors.push(`VELMERE_MASTER_BUILD_MAP.md: missing ${marker}.`);
  }
  if (!progress.includes("PASS257 marker: AI Brain Evidence SLA Timeline")) errors.push("project-progress.ts: missing PASS257 progress marker.");
  if (!areas.includes("PASS257 marker: AI Brain Evidence SLA Timeline Exception Firewall")) errors.push("master-build-areas.ts: missing PASS257 marker.");
  if (!ledger.includes("PASS257 — AI Brain Evidence SLA Timeline Exception Firewall")) errors.push("PROJECT_PROGRESS_LEDGER.md: missing PASS257 ledger marker.");
} catch (error) {
  errors.push(`PASS257 progress map guard failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error("PASS257 evidence SLA timeline exception firewall guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS257 evidence SLA timeline exception firewall safety guard passed.");
