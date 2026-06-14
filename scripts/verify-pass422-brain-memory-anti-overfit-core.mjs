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
  ["lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts", "buildPass422BrainMemoryCore"],
  ["lib/market-integrity/risk-brain.ts", "pass422"],
  ["lib/search/lens-report.ts", "pass422-lens-source-bound-brain"],
  ["app/api/market-integrity/analyze/route.ts", "pass422"],
  ["app/api/search/lens-report/route.ts", "Payload"],
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

let parsed = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  let output;
  try {
    output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.Preserve,
        isolatedModules: true,
      },
      fileName: file,
      reportDiagnostics: true,
    });
  } catch (error) {
    throw new Error(`TypeScript transpile crashed for ${path.relative(root, file)}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS422 brain memory anti-overfit core verified · ${parsed} TS/TSX parsed`);
