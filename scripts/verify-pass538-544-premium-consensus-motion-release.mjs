import fs from "node:fs";

const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass538-provider-consensus-quality.ts",
  "lib/market-integrity/pass539-pdf-page-rhythm.ts",
  "lib/market-integrity/pass540-ai-source-trust-matrix.ts",
  "lib/market-integrity/pass541-shield-focus-lens.ts",
  "lib/motion/pass542-motion-control.ts",
  "scripts/run-pass543-mobile-e2e.mjs",
  "scripts/verify-pass538-544-premium-consensus-motion-release.mjs",
  "tsconfig.pass544.json",
];
for (const file of requiredFiles) if (!fs.existsSync(file)) errors.push(`missing ${file}`);

const markers = [
  ["components/market-integrity/AdvancedMarketChart.tsx", ["data-pass538-provider-consensus-quality", "buildPass538ProviderConsensusQuality"]],
  ["components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass539-pdf-page-rhythm", "buildPass539PdfPageRhythm"]],
  ["app/api/search/lens-report/route.ts", ["pass539Rhythm", "Rhythm ${pass539Rhythm.state}"]],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", ["data-pass540-ai-source-trust", "data-pass542-motion-control"]],
  ["components/market-integrity/ShieldMapCommandClient.tsx", ["data-pass541-shield-focus-lens", "data-pass542-motion-toggle"]],
  ["playwright.config.ts", ["reuseExistingServer: false", "globalTimeout"]],
];
for (const [file, needles] of markers) {
  const source = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const needle of needles) if (!source.includes(needle)) errors.push(`${file} missing ${needle}`);
}

const route = fs.readFileSync("app/api/search/lens-report/route.ts", "utf8");
if (/\n\s*46,\n\s*59,[\s\S]{0,400}\n\s*46,\n\s*58,/.test(route)) {
  errors.push("PDF footer still contains overlapping quality rows");
}
for (const file of requiredFiles.filter((file) => file.endsWith(".ts"))) {
  const source = fs.readFileSync(file, "utf8");
  if (/Math\.random\(/.test(source)) errors.push(`${file} must remain deterministic`);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of [
  "verify:pass538-544-premium-consensus-motion-release",
  "typecheck:pass544",
  "test:e2e:mobile",
]) {
  if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(pkg.scripts?.build || "").includes("verify:pass538-544-premium-consensus-motion-release")) {
  errors.push("PASS538–544 gate missing from build");
}
if (!String(pkg.scripts?.["test:e2e:mobile"] || "").includes("run-pass543-mobile-e2e.mjs")) {
  errors.push("mobile E2E must use the PASS543 leased-port runner");
}

if (errors.length) {
  console.error("PASS538–544 gate failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS538–544 gate PASS · ${requiredFiles.length} files · provider consensus · PDF rhythm · AI source trust · Shield focus · motion control · leased mobile E2E`);
