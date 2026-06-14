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
  ["lib/market-integrity/pass423-long-term-memory-spine.ts", "pass423-long-term-memory-spine"],
  ["lib/market-integrity/risk-ledger.ts", "pass423Retention"],
  ["lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts", "longTermMemory"],
  ["lib/market-integrity/risk-brain.ts", "pass422"],
  ["lib/search/lens-report.ts", "pass423-lens-long-memory-brain"],
  ["app/api/market-integrity/analyze/route.ts", "getPersistentRiskHistory(id)"],
  ["app/api/market-integrity/brain/route.ts", "getPersistentRiskHistory(id)"],
  ["VELMERE_PASS423_LONG_TERM_MEMORY_SPINE_REPORT.md", "PASS423"],
];

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

for (const [file, needle] of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) throw new Error(`Missing required file: ${file}`);
  const text = fs.readFileSync(abs, "utf8");
  if (!text.includes(needle)) throw new Error(`Missing marker ${needle} in ${file}`);
}

const policyText = fs.readFileSync(path.join(root, "lib/market-integrity/pass423-long-term-memory-spine.ts"), "utf8");
for (const needle of ["DEFAULT_RETENTION_DAYS = 1825", "personalDataRule", "no_personal_memory_without_consent", "archiveWeight"]) {
  if (!policyText.includes(needle)) throw new Error(`PASS423 policy missing ${needle}`);
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

console.log(`PASS423 long-term memory spine verified · ${parsed} TS/TSX parsed`);
