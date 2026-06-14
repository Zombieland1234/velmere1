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
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS452 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass452-source-bound-depth-lab-runtime.ts", [
  'version: "pass452-source-bound-depth-lab-runtime"',
  'insight("turnover"',
  'insight("fdvGap"',
  'insight("range"',
  'insight("quorum"',
  'insight("circulation"',
  'insight("confidence"',
  'insight("freshness"',
  'insight("nextProbe"',
  'suggestionLimit: 3',
  'forgeStages: 4',
  'previewDownloadSameBlob: true',
  'backgroundScrollLocked: true',
  'downloadIconRequired: true',
  'dynamicSymbolSearch: true',
  'noFakeVenuePrice: true',
]);

expect("lib/search/lens-report.ts", [
  "buildPass452SourceBoundDepthLab",
  "pass452: Pass452SourceBoundDepthLab",
  "const pass452 = buildPass452SourceBoundDepthLab",
  "pass452,",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass452-browser-realmarkets-qa="true"',
  'data-pass452-signature-insights="true"',
  'data-pass452-pdf-signature-diagnostics="true"',
  'data-testid="lens-search-input"',
  'data-testid="lens-pdf-forge"',
  'data-testid="lens-preview-dialog"',
  'data-testid="lens-download-link"',
  'data-testid="lens-pdf-frame"',
]);

expect("app/api/search/lens-report/route.ts", [
  'signatureDiagnostics: "Diagnostyka Advanced"',
  'signatureDiagnostics: "Advanced-Diagnostik"',
  'signatureDiagnostics: "Advanced diagnostics"',
  "report.pass452?.signatureInsights",
  "report.pass452?.sourcePolicy",
  "PASS452: page four adds source-bound Advanced signature diagnostics",
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass452-dynamic-realmarkets-coverage="true"',
  'data-pass452-venue-lifecycle="true"',
  'symbol: "ORCL"',
  'symbol: "CRM"',
  'symbol: "ADBE"',
  'symbol: "NFLX"',
  'symbol: "ARM"',
  'data-testid="realmarkets-search-input"',
  'data-testid={`realmarkets-tab-${item}`}',
  'data-testid="realmarkets-row"',
]);

expect("scripts/e2e-pass452-browser-realmarkets.mjs", [
  "lens-search-input",
  "lens-pdf-forge",
  "lens-preview-dialog",
  "lens-download-link",
  "realmarkets-search-input",
  "realmarkets-tab-exchanges",
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
    throw new Error(`PASS452 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS452 source-bound depth lab + Browser/Real Markets QA verified · ${parsed} TS/TSX parsed`);
