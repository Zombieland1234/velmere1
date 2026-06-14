import fs from "node:fs";
import path from "node:path";

const errors = [];
const warnings = [];
const read = (file) => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const nodeMajor = Number(process.versions.node.split(".")[0]);
const strictNode24 = process.env.VELMERE_STRICT_NODE24 === "1";

if (!/^>=24\.16\.0 <25$/.test(pkg.engines?.node || "")) errors.push(`package.json engines.node must target Node 24 LTS, got ${pkg.engines?.node || "missing"}`);
if (!fs.existsSync("package-lock.json")) errors.push("package-lock.json is missing");
else {
  const lock = JSON.parse(read("package-lock.json"));
  if ((lock.lockfileVersion || 0) < 3) errors.push(`lockfileVersion must be >= 3, got ${lock.lockfileVersion || "missing"}`);
}
if (nodeMajor !== 24) {
  const message = `runtime is Node ${process.versions.node}; production contract is Node 24.x`;
  if (strictNode24) errors.push(message); else warnings.push(message);
}

const requiredScripts = [
  "typecheck",
  "vercel:preflight",
  "verify:pass637-641-release-proof",
  "test:e2e:pass640",
  "proof:pass641-build",
];
for (const script of requiredScripts) if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);

const requiredFiles = [
  "scripts/create-pass641-build-proof.mjs",
  "tests/e2e/pass640-release-route-matrix.spec.ts",
  "next.config.mjs",
  "lib/market-integrity/pass602-neural-evidence-topology.ts",
  "app/api/search/lens-report/route.ts",
];
for (const file of requiredFiles) if (!fs.existsSync(file)) errors.push(`missing ${file}`);

const nextConfig = read("next.config.mjs");
for (const marker of ["turbopack", "qualities", "remotePatterns"]) {
  if (!nextConfig.includes(marker)) errors.push(`next.config.mjs missing Next 16 platform marker ${marker}`);
}
if (!pkg.scripts?.["build:webpack"]?.includes("next build --webpack")) errors.push("package.json build:webpack must provide a memory-stable Next 16 fallback");
if (/ignoreBuildErrors\s*:\s*true/.test(nextConfig)) errors.push("ignoreBuildErrors=true is forbidden");
if (/ignoreDuringBuilds\s*:\s*true/.test(nextConfig)) errors.push("ignoreDuringBuilds=true is forbidden");

const tsconfig = JSON.parse(read("tsconfig.json"));
if (tsconfig.compilerOptions?.strict !== true) errors.push("tsconfig strict must remain true");

const matrix = read("tests/e2e/pass640-release-route-matrix.spec.ts");
for (const marker of ["pl", "de", "en", "market-integrity", "cross-asset", "shield-map", "reducedMotion", "forcedColors", "deviceScaleFactor", "200%", "keyboard", "touch"]) {
  if (!matrix.includes(marker)) errors.push(`PASS640 route matrix missing marker ${marker}`);
}

const proxy = read("proxy.ts");
for (const marker of ["stripRedundantLocaleSelfRewrite", "x-middleware-rewrite", "x-next-intl-locale"]) {
  if (!proxy.includes(marker)) errors.push(`proxy missing locale self-rewrite guard ${marker}`);
}

const neural = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
if (neural.includes("zIndex: 2_147_483_647")) errors.push("unbounded VLM Brain z-index returned");
const chart = read("components/market-integrity/AdvancedMarketChart.tsx");
for (const marker of ["readPass504ChartView", "writePass504ChartView", "providerRouteNextAction"]) {
  if (!chart.includes(marker)) errors.push(`AdvancedMarketChart missing compatibility marker ${marker}`);
}
const pdfRoute = read("app/api/search/lens-report/route.ts");
for (const marker of ["source.evidenceState", "x-velmere-pass488-page-count", "reader_download_manifest_mismatch"]) {
  if (!pdfRoute.includes(marker)) errors.push(`Lens PDF route missing marker ${marker}`);
}

if (fs.existsSync("node_modules")) {
  if (!fs.existsSync("node_modules/.package-lock.json")) warnings.push("node_modules exists without local package-lock receipt");
} else {
  warnings.push("node_modules absent: clean-install execution proof must be produced in CI/Node24 before deployment");
}

if (errors.length) {
  console.error("PASS637–641 release-proof verifier failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS637–641 release-proof contract PASS · Node contract ${pkg.engines.node} · runtime ${process.versions.node}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
