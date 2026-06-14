import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
const checks = [
  ["lib/market-integrity/pass446-human-readout-lane-runtime.ts", "pass446-human-readout-lane"],
  ["lib/market-integrity/unified-audit.ts", "humanMissingValue"],
  ["lib/search/lens-report.ts", "buildPass446HumanReadoutContract"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass446-browser-human-readout"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass446-pdf-depth-matrix"],
  ["app/api/search/lens-report/route.ts", "/Kids [4 0 R 6 0 R 8 0 R] /Count 3"],
  ["app/api/search/lens-report/route.ts", "DEPTH MATRIX"],
  ["app/api/search/route.ts", "fully_diluted_valuation"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass446-realmarkets-venue-catalog"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "RMS.PA"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "BINANCEVENUE"],
];
for (const [file, needle] of checks) {
  if (!read(file).includes(needle)) throw new Error(`${file}: missing PASS446 marker ${needle}`);
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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS446 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}
console.log(`PASS446 human readout PDF depth + Real Markets verified · ${parsed} TS/TSX parsed`);
