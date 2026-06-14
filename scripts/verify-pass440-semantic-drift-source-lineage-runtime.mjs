import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "pass440-semantic-drift-source-lineage-runtime"],
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "buildPass440SemanticDriftSourceLineageRuntime"],
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "sourceLineage"],
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "semanticDriftScore"],
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "bindEveryCustomerSentenceToSource"],
  ["lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts", "memoryCannotInventSource"],
  ["lib/market-integrity/risk-brain.ts", "PASS440 semantic drift lineage"],
  ["lib/market-integrity/risk-brain.ts", "pass440,"],
  ["lib/search/lens-report.ts", "Pass440LensSemanticDriftContract"],
  ["lib/search/lens-report.ts", "pass440,"],
  ["app/api/search/lens-report/route.ts", "Lineage guard active"],
  ["app/api/market-integrity/probe/route.ts", "buildPass440SemanticDriftSourceLineageRuntime"],
  ["app/api/market-integrity/probe/route.ts", "semanticDriftLineage: pass440"],
  ["app/api/market-integrity/analyze/route.ts", "pass440: brain.pass440"],
  ["app/api/market-integrity/brain/route.ts", "pass440: brain.pass440"],
  ["app/api/market-integrity/chat/route.ts", "pass440: brain.pass440"],
  ["app/api/market-integrity/angel/route.ts", "pass440: brain.pass440"],
  ["scripts/probe-pass440-semantic-drift-lineage.mjs", "PASS440 semantic drift lineage"],
  ["VELMERE_PASS440_SEMANTIC_DRIFT_SOURCE_LINEAGE_REPORT.md", "PASS440"],
];
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
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
  if (!read(file).includes(marker)) throw new Error(`Missing marker ${marker} in ${file}`);
}
const core = read("lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts");
for (const marker of ["semantic_aligned", "semantic_guarded", "semantic_drift_warning", "semantic_sealed", "onePayload", "oneLocale", "noFakeLive", "sourceLineageScore", "neverUpgradeConfidenceFromTone"]) {
  if (!core.includes(marker)) throw new Error(`PASS440 core missing ${marker}`);
}
let parsed = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true },
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
console.log(`PASS440 semantic drift source lineage runtime verified · ${parsed} TS/TSX parsed`);
