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
const required = [
  ["lib/market-integrity/pass424-brain-error-correction-core.ts", "pass424-brain-error-correction-core"],
  ["lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts", "pass424"],
  ["lib/market-integrity/risk-brain.ts", "PASS424 correction"],
  ["lib/search/lens-report.ts", "pass424-lens-narrative-correction"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "vis-token-suggest-panel"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "selectSuggestion(item)"],
  ["components/security/SecurityTrustPage.tsx", "SecurityOperationsChecklistPanel"],
  ["app/api/search/lens-report/route.ts", "escapeHtml"],
  ["VELMERE_PASS424_BRAIN_ERROR_CORRECTION_RUNTIME_REPORT.md", "PASS424"],
];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "out", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

for (const [file, marker] of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) throw new Error(`Missing required file: ${file}`);
  const text = read(file);
  if (!text.includes(marker)) throw new Error(`Missing marker ${marker} in ${file}`);
}

for (const file of [
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
]) {
  if (read(file).includes("<img")) throw new Error(`${file}: raw <img> returned`);
}

const brainText = read("lib/market-integrity/pass424-brain-error-correction-core.ts");
for (const marker of ["contradictionScore", "narrativeNoiseBudget", "overfitBrake", "fieldBudget", "deterministicNarrativeRules"]) {
  if (!brainText.includes(marker)) throw new Error(`PASS424 brain missing ${marker}`);
}

let parsed = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
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
    throw new Error(`TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS424 brain error correction runtime verified · ${parsed} TS/TSX parsed`);
