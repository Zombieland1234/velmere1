import fs from "node:fs";

const errors = [];
const warnings = [];
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const runtimeMajor = Number(process.versions.node.split(".")[0]);
const strict = process.env.VELMERE_STRICT_NODE20 === "1";
if (pkg.engines?.node !== "20.x") errors.push(`engines.node must be 20.x, received ${pkg.engines?.node || "missing"}`);
if (runtimeMajor !== 20) {
  const message = `runtime is Node ${process.versions.node}; final production build contract requires Node 20.x`;
  if (strict) errors.push(message); else warnings.push(message);
}

const routes = [
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/market-integrity/cross-asset/page.tsx",
  "app/[locale]/market-integrity/shield-map/page.tsx",
  "app/api/search/lens-report/route.ts",
  "app/api/market-integrity/real-markets/route.ts",
];
for (const route of routes) if (!fs.existsSync(route)) errors.push(`missing route ${route}`);

const requiredScripts = ["build", "typecheck", "vercel:preflight", "test:e2e:mobile"];
for (const script of requiredScripts) if (!pkg.scripts?.[script]) errors.push(`missing script ${script}`);
if (!fs.existsSync("playwright.config.ts")) errors.push("missing playwright.config.ts");
if (!fs.existsSync("tests/e2e/pass536-mobile-gesture-viewports.spec.ts")) errors.push("missing PASS536 test suite");

const budgets = [
  ["components/market-integrity/AdvancedMarketChart.tsx", 180_000],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", 240_000],
  ["components/market-integrity/ShieldMapCommandClient.tsx", 290_000],
  ["components/search/VelmereIntelligenceSearchClient.tsx", 340_000],
  ["app/api/search/lens-report/route.ts", 240_000],
];
for (const [file, max] of budgets) {
  if (!fs.existsSync(file)) continue;
  const size = fs.statSync(file).size;
  if (size > max) errors.push(`${file} exceeds source budget ${size}/${max}`);
}

if (errors.length) {
  console.error("PASS537 Node 20 / route smoke failed");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`PASS537 route smoke PASS · Node engine ${pkg.engines.node} · ${routes.length} routes · ${budgets.length} source budgets`);
warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
