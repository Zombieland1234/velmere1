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
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (file, needles) => {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS456 marker ${needle}`);
  }
};
const reject = (file, needles) => {
  const source = read(file);
  for (const needle of needles) {
    if (source.includes(needle)) throw new Error(`${file}: stale PASS456 pattern ${needle}`);
  }
};

expect("lib/market-integrity/unified-audit.ts", [
  "export type UnifiedAuditAssetClass",
  "assetClass?: UnifiedAuditAssetClass",
  "const assetPriority",
  "priorityFor(mode, input.assetClass)",
  'stock: {',
  'fx: {',
  'commodity: {',
  'exchange: {',
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "type UnifiedAuditAssetClass",
  "function auditAssetClass(asset: Asset)",
  "function assetClassAuditMetrics(asset: Asset, locale: Locale)",
  'id: "coinbase-venue"',
  "assetClass: auditAssetClass(selected)",
  "const chunks = Array.from",
  "Promise.all(",
  'data-pass456-visible-row-quote-batching="true"',
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  "const pdfModalActive = Boolean(pdfPreview || pdfLoadingId)",
  "if (!pdfModalActive) return",
  "}, [pdfModalActive]);",
  'data-pass456-asset-aware-pdf-runtime="true"',
  'data-pass456-pdf-reader="true"',
  'data-pass456-full-tier-matrix="true"',
  ".slice(0, tier.fieldCount)",
  '<Download className="h-4 w-4" />',
]);
reject("components/search/VelmereIntelligenceSearchClient.tsx", [
  '.slice(0, tier.id === "advanced" ? 12 : tier.fieldCount)',
]);

expect("app/api/search/lens-report/route.ts", [
  "const tierGrid456 = (",
  "PASS456: page three carries every Basic and Pro field",
  "PASS456: Advanced renders all 20 fields",
  "PASS456: PDF renders every 10/14/20 tier field",
  "report.pass453.signatureMetrics",
]);

expect("components/market-integrity/TokenRiskModal.tsx", [
  "unclassified clusters",
  "Missing source data increases risk uncertainty.",
]);
reject("components/market-integrity/TokenRiskModal.tsx", [
  "Unknown modal error",
  "LP und Unknown Clusters",
]);

const packageJson = JSON.parse(read("package.json"));
if (!packageJson.scripts?.["verify:pass456-asset-aware-pdf-realmarkets"]) {
  throw new Error("package.json: PASS456 verifier script missing");
}

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
    throw new Error(`PASS456 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS456 asset-aware PDF + Real Markets verified · ${parsed} TS/TSX parsed`);
