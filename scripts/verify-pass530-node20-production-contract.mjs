import fs from "node:fs";
import path from "node:path";

const errors = [];
const warnings = [];
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const declaredNode = String(packageJson.engines?.node || "");
if (!/^20(?:\.|\.x|$)/.test(declaredNode)) errors.push(`package.json engines.node must target Node 20.x, received ${declaredNode || "missing"}`);

const requiredRoutes = [
  "app/api/search/lens-report/route.ts",
  "app/api/search/route.ts",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/market-integrity/cross-asset/page.tsx",
];
for (const file of requiredRoutes) {
  if (!fs.existsSync(file)) errors.push(`missing production route ${file}`);
}

const budgets = [
  ["app/api/search/lens-report/route.ts", 220_000],
  ["components/market-integrity/AdvancedMarketChart.tsx", 150_000],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", 220_000],
  ["components/market-integrity/ShieldMapCommandClient.tsx", 260_000],
  ["components/search/VelmereIntelligenceSearchClient.tsx", 320_000],
];
for (const [file, maxBytes] of budgets) {
  if (!fs.existsSync(file)) continue;
  const bytes = fs.statSync(file).size;
  if (bytes > maxBytes) errors.push(`${file} exceeds source budget: ${bytes}/${maxBytes} bytes`);
}

const forbiddenRoots = [".next", ".git"];
for (const entry of forbiddenRoots) {
  if (fs.existsSync(entry) && fs.statSync(entry).isFile()) errors.push(`${entry} must not be a file`);
}

const runtimeMajor = Number(process.versions.node.split(".")[0]);
if (runtimeMajor !== 20) warnings.push(`verification is running on Node ${process.versions.node}; Vercel production contract remains Node 20.x`);

const verifier = "verify:pass530-node20-production-contract";
if (!String(packageJson.scripts?.build || "").includes(verifier)) errors.push("PASS530 is missing from npm run build");
if (!packageJson.scripts?.[verifier]) errors.push("PASS530 verifier script is missing");

if (errors.length) {
  console.error("PASS530 production contract failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS530 production contract PASS · Node engine ${declaredNode} · ${requiredRoutes.length} routes · ${budgets.length} source budgets`);
warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
