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
  ["lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts", "pass427-brain-bugfix-integrity-runtime"],
  ["lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts", "repairQueue"],
  ["lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts", "visibleSuggestionLimit: 3"],
  ["lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts", "noSecondCopyEngine"],
  ["lib/market-integrity/risk-brain.ts", "PASS427 bugfix integrity"],
  ["lib/market-integrity/risk-brain.ts", "pass427,"],
  ["lib/search/lens-report.ts", "buildPass427LensPreviewLock"],
  ["app/api/market-integrity/analyze/route.ts", "pass427: brain.pass427"],
  ["app/api/market-integrity/brain/route.ts", "pass427: brain.pass427"],
  ["VELMERE_PASS427_BRAIN_BUGFIX_INTEGRITY_RUNTIME_REPORT.md", "PASS427"],
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

const pass427 = read("lib/market-integrity/pass427-brain-bugfix-integrity-runtime.ts");
for (const marker of ["finite_score_guard", "source_quorum_guard", "missing_data_dedupe_guard", "history_integrity_guard", "narrative_contract_guard", "hallucination_brake_guard"]) {
  if (!pass427.includes(marker)) throw new Error(`PASS427 sanity guard missing ${marker}`);
}
if (!pass427.includes("onePayload: true") || !pass427.includes("localeBound: true") || !pass427.includes("deterministicNarrative: true")) {
  throw new Error("PASS427 payload contract must be one-payload, locale-bound and deterministic.");
}
if (/NEXT_PUBLIC_.*ANGEL/.test(pass427)) throw new Error("PASS427 must not expose Angel/API keys to client env.");

const lens = read("lib/search/lens-report.ts");
if (!lens.includes("pass427: Pass427LensPreviewLock")) throw new Error("Lens report must expose PASS427 preview lock.");
if (!lens.includes("pass427,")) throw new Error("Lens report must return PASS427 preview lock.");

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

console.log(`PASS427 brain bugfix integrity runtime verified · ${parsed} TS/TSX parsed`);
