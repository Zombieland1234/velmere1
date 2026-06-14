import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
const checks = [
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass444-lens-pdf-forge"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "forgeSteps"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "document.body.style.overflow = \"hidden\""],
  ["app/api/search/lens-report/route.ts", "function headline"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "BINANCEVENUE"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "quoteObject"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "modeHint"],
  ["lib/market-integrity/unified-audit.ts", "function formatAuditValue"],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", "activeStage"],
  ["components/market-integrity/AdvancedMarketChart.tsx", "Natural terminal pan"],
];
for (const [file, needle] of checks) {
  if (!read(file).includes(needle)) throw new Error(`${file}: missing PASS444 marker ${needle}`);
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
    throw new Error(`PASS444 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}
console.log(`PASS444 browser/realmarkets UI AI verified · ${parsed} TS/TSX parsed`);
