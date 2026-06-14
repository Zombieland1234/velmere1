import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "pass442-brain-regression-judge-runtime"],
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "buildPass442BrainRegressionJudgeRuntime"],
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "noQualityBackslide"],
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "doNotHideMissingData"],
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "memoryCannotOverrideLiveProbe"],
  ["lib/market-integrity/pass442-regression-judge-runtime.ts", "buildPass442LensRegressionJudgeContract"],
  ["lib/market-integrity/risk-brain.ts", "PASS442 regression judge"],
  ["lib/market-integrity/risk-brain.ts", "pass442,"],
  ["lib/search/lens-report.ts", "Pass442LensRegressionJudgeContract"],
  ["lib/search/lens-report.ts", "pass442,"],
  ["app/api/search/lens-report/route.ts", "pass442-lens-regression-judge-contract"],
  ["app/api/market-integrity/probe/route.ts", "buildPass442BrainRegressionJudgeRuntime"],
  ["app/api/market-integrity/probe/route.ts", "brainRegressionJudge: pass442"],
  ["app/api/market-integrity/analyze/route.ts", "pass442: brain.pass442"],
  ["app/api/market-integrity/brain/route.ts", "pass442: brain.pass442"],
  ["app/api/market-integrity/chat/route.ts", "pass442: brain.pass442"],
  ["app/api/market-integrity/angel/route.ts", "pass442: brain.pass442"],
  ["scripts/probe-pass442-regression-judge.mjs", "PASS442 regression judge"],
  ["VELMERE_PASS442_BRAIN_REGRESSION_JUDGE_REPORT.md", "PASS442"],
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
const core = read("lib/market-integrity/pass442-regression-judge-runtime.ts");
for (const marker of ["quality_stable", "guarded_regression", "sealed_regression", "operator_regression_review", "core_fields_no_backslide", "second_provider_regression", "fake_live_budget_no_backslide", "pdf_payload_regression_lock", "memory_not_live_provider"]) {
  if (!core.includes(marker)) throw new Error(`PASS442 core missing ${marker}`);
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
console.log(`PASS442 brain regression judge runtime verified · ${parsed} TS/TSX parsed`);
