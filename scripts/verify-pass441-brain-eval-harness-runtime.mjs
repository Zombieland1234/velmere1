import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "pass441-brain-eval-harness-runtime"],
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "buildPass441BrainEvalHarnessRuntime"],
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "evalBeforeNarration"],
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "memoryCannotBecomeProvider"],
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "missingDataMustStayVisible"],
  ["lib/market-integrity/pass441-brain-eval-harness-runtime.ts", "buildPass441LensEvalHarnessContract"],
  ["lib/market-integrity/risk-brain.ts", "PASS441 brain eval harness"],
  ["lib/market-integrity/risk-brain.ts", "pass441,"],
  ["lib/search/lens-report.ts", "Pass441LensEvalHarnessContract"],
  ["lib/search/lens-report.ts", "pass441,"],
  ["app/api/search/lens-report/route.ts", "pass441-lens-eval-harness-contract"],
  ["app/api/market-integrity/probe/route.ts", "buildPass441BrainEvalHarnessRuntime"],
  ["app/api/market-integrity/probe/route.ts", "brainEvalHarness: pass441"],
  ["app/api/market-integrity/analyze/route.ts", "pass441: brain.pass441"],
  ["app/api/market-integrity/brain/route.ts", "pass441: brain.pass441"],
  ["app/api/market-integrity/chat/route.ts", "pass441: brain.pass441"],
  ["app/api/market-integrity/angel/route.ts", "pass441: brain.pass441"],
  ["scripts/probe-pass441-brain-eval-harness.mjs", "PASS441 brain eval harness"],
  ["VELMERE_PASS441_BRAIN_EVAL_HARNESS_REPORT.md", "PASS441"],
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
const core = read("lib/market-integrity/pass441-brain-eval-harness-runtime.ts");
for (const marker of ["eval_green", "eval_guarded", "eval_sealed", "operator_eval_review", "Price is source-backed", "Second provider or confidence cap", "Fake-live budget is safe", "PDF/chat one payload invariant", "Memory cannot invent provider evidence"]) {
  if (!core.includes(marker)) throw new Error(`PASS441 core missing ${marker}`);
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
console.log(`PASS441 brain eval harness runtime verified · ${parsed} TS/TSX parsed`);
