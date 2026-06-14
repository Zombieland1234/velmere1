import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "pass438-provider-execution-loop-runtime"],
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "buildPass438ProviderExecutionLoopRuntime"],
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "providerExecutionLedger"],
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "structuredErrorPolicy"],
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "tracePolicy"],
  ["lib/market-integrity/pass438-provider-execution-loop-runtime.ts", "retryOnlyIdempotentReads"],
  ["lib/market-integrity/risk-brain.ts", "PASS438 provider execution loop"],
  ["lib/market-integrity/risk-brain.ts", "pass438,"],
  ["lib/search/lens-report.ts", "Pass438LensProviderExecutionContract"],
  ["lib/search/lens-report.ts", "pass438,"],
  ["app/api/market-integrity/probe/route.ts", "buildPass438ProviderExecutionLoopRuntime"],
  ["app/api/market-integrity/probe/route.ts", "providerExecutionLoop: pass438"],
  ["app/api/market-integrity/analyze/route.ts", "pass438: brain.pass438"],
  ["app/api/market-integrity/brain/route.ts", "pass438: brain.pass438"],
  ["app/api/market-integrity/chat/route.ts", "pass438: brain.pass438"],
  ["app/api/market-integrity/angel/route.ts", "pass438: brain.pass438"],
  ["scripts/probe-pass438-provider-execution-loop.mjs", "PASS438 provider execution loop"],
  ["VELMERE_PASS438_PROVIDER_EXECUTION_LOOP_REPORT.md", "PASS438"],
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
const core = read("lib/market-integrity/pass438-provider-execution-loop-runtime.ts");
for (const marker of ["execute_ready", "execute_with_retry", "dry_run_facts_only", "operator_pause", "recordProviderAttempt", "onePayload", "noFakeLive", "confidenceDelta"]) {
  if (!core.includes(marker)) throw new Error(`PASS438 core missing ${marker}`);
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
console.log(`PASS438 provider execution loop runtime verified · ${parsed} TS/TSX parsed`);
