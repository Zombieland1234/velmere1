import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const files = [
  "lib/market-integrity/vlm-brain-export-authorization-gate.ts",
  "lib/market-integrity/vlm-brain-browser-evidence-collector.ts",
  "lib/market-integrity/vlm-brain-adapter-readiness-scheduler.ts",
  "lib/market-integrity/vlm-brain-customer-brief-builder.ts",
  "lib/market-integrity/vlm-brain-wallet-session-policy.ts",
  "lib/market-integrity/vlm-brain-release-readiness-orchestrator.ts",
];
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: missing PASS246-PASS251 implementation file.`);
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));
const preflight = read("scripts/vercel-preflight.mjs");

for (const marker of [
  "buildVlmBrainExportAuthorizationGate",
  "buildVlmBrainBrowserEvidenceCollector",
  "buildVlmBrainAdapterReadinessScheduler",
  "buildVlmBrainCustomerBriefBuilder",
  "buildVlmBrainWalletSessionPolicy",
  "buildVlmBrainReleaseReadinessOrchestrator",
  'data-vlm-export-authorization-gate="pass246"',
  'data-vlm-browser-evidence-collector="pass247"',
  'data-vlm-adapter-readiness-scheduler="pass248"',
  'data-vlm-customer-brief-builder="pass249"',
  'data-vlm-wallet-session-policy="pass250"',
  'data-vlm-release-readiness-orchestrator="pass251"',
  "PASS251 marker",
]) {
  if (!modal.includes(marker)) errors.push(`TokenRiskModal.tsx: missing marker ${marker}`);
}

const contractMarkers = [
  "PASS246_VLM_BRAIN_EXPORT_AUTHORIZATION_GATE_CONTRACT",
  "PASS247_VLM_BRAIN_BROWSER_EVIDENCE_COLLECTOR_CONTRACT",
  "PASS248_VLM_BRAIN_ADAPTER_READINESS_SCHEDULER_CONTRACT",
  "PASS249_VLM_BRAIN_CUSTOMER_BRIEF_BUILDER_CONTRACT",
  "PASS250_VLM_BRAIN_WALLET_SESSION_POLICY_CONTRACT",
  "PASS251_VLM_BRAIN_RELEASE_READINESS_ORCHESTRATOR_CONTRACT",
];
for (let i = 0; i < files.length; i += 1) {
  const source = read(files[i]);
  if (!source.includes(contractMarkers[i])) errors.push(`${files[i]}: missing contract marker ${contractMarkers[i]}`);
}

for (const marker of [
  "publicExportAllowed: false",
  "binaryPdfAllowed: false",
  "rawPayloadAllowed: false",
  "walletAccessAllowed: false",
]) {
  if (!read("lib/market-integrity/vlm-brain-export-authorization-gate.ts").includes(marker) && !read("lib/market-integrity/vlm-brain-release-readiness-orchestrator.ts").includes(marker)) {
    errors.push(`PASS246-PASS251 export safety: missing ${marker}`);
  }
}

for (const marker of ["seedPhraseAllowed: false", "privateKeyAllowed: false", "roiCopyAllowed: false", "publicSaleAllowed: false"]) {
  if (!read("lib/market-integrity/vlm-brain-wallet-session-policy.ts").includes(marker)) errors.push(`wallet session policy: missing ${marker}`);
}

if (!css.includes("PASS246–PASS251 — AI Brain real six-pass")) errors.push("globals.css: missing PASS246-PASS251 CSS marker.");
if (!pkg.scripts?.["verify:pass246-251-ai-brain-real-six-pass"]) errors.push("package.json: missing verify:pass246-251-ai-brain-real-six-pass script.");
if (!String(pkg.scripts?.["verify:shield-all"] ?? "").includes("verify:pass246-251-ai-brain-real-six-pass")) errors.push("package.json: verify:shield-all does not include PASS246-PASS251 guard.");
if (!preflight.includes("PASS246-PASS251 AI Brain real six-pass guard")) errors.push("vercel-preflight.mjs: missing PASS246-PASS251 guard.");

if (errors.length) {
  console.error("PASS246-PASS251 AI Brain real six-pass guard failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS246-PASS251 AI Brain real six-pass guard passed.");
