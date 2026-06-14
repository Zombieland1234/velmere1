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
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "pass431-brain-critic-loop-runtime"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "buildPass431BrainCriticLoopRuntime"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "buildPass431LensCriticContract"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "criticBeforePublicAnswer: true"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "onePayloadOnly: true"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "fieldBudgetLocked"],
  ["lib/market-integrity/pass431-brain-critic-loop-runtime.ts", "memoryMayContextButNotOverride: true"],
  ["lib/market-integrity/risk-brain.ts", "PASS431 critic loop"],
  ["lib/market-integrity/risk-brain.ts", "pass431,"],
  ["lib/search/lens-report.ts", "Pass431LensCriticContract"],
  ["lib/search/lens-report.ts", "pass431,"],
  ["app/api/market-integrity/analyze/route.ts", "pass431: brain.pass431"],
  ["app/api/market-integrity/brain/route.ts", "pass431: brain.pass431"],
  ["app/api/market-integrity/chat/route.ts", "pass431: brain.pass431"],
  ["app/api/market-integrity/angel/route.ts", "pass431: brain.pass431"],
  ["VELMERE_PASS431_BRAIN_CRITIC_LOOP_RUNTIME_REPORT.md", "PASS431"],
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

const pass431 = read("lib/market-integrity/pass431-brain-critic-loop-runtime.ts");
for (const marker of ["criticMode", "finalAnswerMode", "repetitionAudit", "claimAudit", "sourceAudit", "fieldBudgetGuard", "memoryReplayGate", "pdfChatInvariant", "noSecondNarrativeGenerator: true"]) {
  if (!pass431.includes(marker)) throw new Error(`PASS431 critic marker missing ${marker}`);
}
if (/NEXT_PUBLIC_.*ANGEL|NEXT_PUBLIC_.*AI|NEXT_PUBLIC_.*KEY/.test(pass431)) {
  throw new Error("PASS431 must not expose AI/provider keys to client env.");
}
if (!pass431.includes("visibleSuggestionLimit: 3")) throw new Error("PASS431 Lens contract must preserve 3 visible suggestions.");
if (!pass431.includes("customerFacingOnly: true")) throw new Error("PASS431 Lens contract must keep technical payload language out of customer UI.");
if (!pass431.includes("fieldBudgetLocked: { basic: 10, pro: 14, advanced: 20 }")) throw new Error("PASS431 must keep 10/14/20 field budget locked.");

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

console.log(`PASS431 brain critic loop runtime verified · ${parsed} TS/TSX parsed`);
