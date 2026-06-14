import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function expect(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS450 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass450-tiered-human-analysis-runtime.ts", [
  'version: "pass450-tiered-human-analysis-runtime"',
  'fieldCount: 10 | 14 | 20',
  'id: "basic"',
  'id: "pro"',
  'id: "advanced"',
  'Wymaga źródła:',
  'Quelle erforderlich:',
  'Source required:',
  '"marketCap"',
  '"fdv"',
  '"slippage"',
  '"holders"',
  '"anomaly"',
]);

expect("lib/search/intelligence-search-contract.ts", [
  "export type VelmereMarketSnapshot",
  "marketSnapshot?: VelmereMarketSnapshot",
  "holderConcentrationLabel?: string",
  "venueHealthLabel?: string",
]);

expect("app/api/search/route.ts", [
  "marketSnapshot:",
  "circulating_supply",
  "total_supply",
  "max_supply",
  "last_updated",
]);

expect("lib/search/lens-report.ts", [
  "buildPass450TieredHumanAnalysis",
  "pass450: Pass450TieredHumanAnalysis",
  "const pass450 = buildPass450TieredHumanAnalysis",
]);

expect("app/api/search/lens-report/route.ts", [
  "report.pass450?.customerHeadline",
  "report.pass450?.tiers",
  "report.pass450?.unknownPolicy",
  "report.pass450?.reportArchitecture",
  "Decision map",
  "/Count 4",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass450-tiered-human-report="true"',
  'data-pass450-market-snapshot="true"',
  'data-pass450-four-stage-v-forge="true"',
  'data-pass450-hard-scroll-lock="true"',
  "Download",
]);

expect("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  'data-pass450-tiered-human-field="true"',
  "10",
  "14",
  "20",
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass450-market-coverage-rail="true"',
  'symbol: "BINANCE"',
  'symbol: "MEXC"',
  "coverageCounts",
]);

expect("components/market-integrity/TokenRiskModal.tsx", [
  "const turnover",
  "const liquidityRatio",
  "const unlockPressure",
  "agentDisagreement",
  "sourceQuorum",
]);

const skip = new Set(["node_modules", ".next", ".git", ".vercel", ".turbo", ".cache", "out", "dist"]);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(root);

let parsed = 0;
for (const file of files) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS450 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS450 tiered human analysis + PDF/Browser/Real Markets verified · ${parsed} TS/TSX parsed`);
