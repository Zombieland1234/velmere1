import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "pass436-world-brain-slo-graph-runtime"],
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "buildPass436WorldBrainSloGraphRuntime"],
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "structuredAnswerSchema"],
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "evidence_lattice"],
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "confidence_escrow"],
  ["lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts", "shadow_twin_replay"],
  ["lib/market-integrity/risk-brain.ts", "PASS436 world-brain SLO graph"],
  ["lib/market-integrity/risk-brain.ts", "pass436,"],
  ["lib/search/lens-report.ts", "Pass436LensWorldBrainContract"],
  ["lib/search/lens-report.ts", "pass436,"],
  ["app/api/market-integrity/probe/route.ts", "buildPass436WorldBrainSloGraphRuntime"],
  ["app/api/market-integrity/probe/route.ts", "worldBrainSloGraph: pass436"],
  ["app/api/market-integrity/analyze/route.ts", "pass436: brain.pass436"],
  ["app/api/market-integrity/brain/route.ts", "pass436: brain.pass436"],
  ["app/api/market-integrity/chat/route.ts", "pass436: brain.pass436"],
  ["app/api/market-integrity/angel/route.ts", "pass436: brain.pass436"],
  ["scripts/probe-pass436-world-brain-slo-graph.mjs", "PASS436 world brain SLO graph"],
  ["VELMERE_PASS436_WORLD_BRAIN_SLO_GRAPH_REPORT.md", "PASS436"],
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
const core = read("lib/market-integrity/pass436-world-brain-slo-graph-runtime.ts");
for (const marker of ["observe", "normalize", "arbitrate", "verify", "narrate", "escalate", "json_schema_locked", "operator_interrupt", "ship_verified_readout", "ship_missing_data_readout"]) {
  if (!core.includes(marker)) throw new Error(`PASS436 core missing ${marker}`);
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
console.log(`PASS436 world brain SLO graph runtime verified · ${parsed} TS/TSX parsed`);
