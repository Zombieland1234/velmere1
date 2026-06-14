import fs from "node:fs";

const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass545-provider-consensus-explainability.ts",
  "lib/market-integrity/pass546-ai-remediation-plan.ts",
  "lib/market-integrity/pass547-pdf-visual-release-audit.ts",
  "lib/market-integrity/pass548-shield-temporal-replay.ts",
  "lib/motion/pass549-interaction-budget.ts",
  "scripts/run-pass543-mobile-e2e.mjs",
  "scripts/verify-pass545-551-premium-explainability-release.mjs",
  "tsconfig.pass551.json",
];
for (const file of requiredFiles) if (!fs.existsSync(file)) errors.push(`missing ${file}`);

const markers = [
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass545-provider-consensus-explainability", "buildPass545ProviderConsensusExplainability"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass546-ai-remediation-plan", "buildPass546AiRemediationPlan"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass547-pdf-visual-release-audit", "buildPass547PdfVisualReleaseAudit"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass548-shield-temporal-replay", "data-pass549-interaction-budget", "buildPass548ShieldTemporalReplay"]],
  ["scripts/run-pass543-mobile-e2e.mjs", ["chromium.executablePath()", "PASS550 browser environment gate failed", "reserveFreePort"]],
];
for (const [file, needles] of markers) {
  const source = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const needle of needles) if (!source.includes(needle)) errors.push(`${file} missing ${needle}`);
}

for (const file of requiredFiles.filter((file) => file.endsWith(".ts"))) {
  const source = fs.readFileSync(file, "utf8");
  if (/Math\.random\(/.test(source)) errors.push(`${file} must remain deterministic`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of [
  "verify:pass545-551-premium-explainability-release",
  "typecheck:pass551",
  "test:e2e:mobile",
]) {
  if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(pkg.scripts?.build || "").includes("verify:pass545-551-premium-explainability-release")) {
  errors.push("PASS545–551 gate missing from build");
}

if (errors.length) {
  console.error("PASS545–551 gate failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS545–551 gate PASS · ${requiredFiles.length} files · consensus explainability · AI remediation · PDF visual audit · Shield replay · interaction budget · browser environment gate`);
