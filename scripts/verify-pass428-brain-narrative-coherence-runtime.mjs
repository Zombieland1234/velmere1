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
  ["lib/market-integrity/pass428-brain-narrative-coherence-runtime.ts", "pass428-brain-narrative-coherence-runtime"],
  ["lib/market-integrity/pass428-brain-narrative-coherence-runtime.ts", "buildPass428BrainNarrativeCoherenceRuntime"],
  ["lib/market-integrity/pass428-brain-narrative-coherence-runtime.ts", "buildPass428LensNarrativeCoherenceLock"],
  ["lib/market-integrity/pass428-brain-narrative-coherence-runtime.ts", "noTechnicalPayloadCopy: true"],
  ["lib/market-integrity/risk-brain.ts", "PASS428 narrative coherence"],
  ["lib/market-integrity/risk-brain.ts", "pass428,"],
  ["lib/search/lens-report.ts", "Pass428LensNarrativeCoherenceLock"],
  ["lib/search/lens-report.ts", "pass428,"],
  ["app/api/market-integrity/analyze/route.ts", "pass428: brain.pass428"],
  ["app/api/market-integrity/brain/route.ts", "pass428: brain.pass428"],
  ["app/api/market-integrity/chat/route.ts", "pass428: brain.pass428"],
  ["app/api/market-integrity/angel/route.ts", "pass428: brain.pass428"],
  ["VELMERE_PASS428_BRAIN_NARRATIVE_COHERENCE_RUNTIME_REPORT.md", "PASS428"],
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

const pass428 = read("lib/market-integrity/pass428-brain-narrative-coherence-runtime.ts");
for (const marker of ["coherenceMode", "duplicateBodyCount", "localeLeakCount", "displayedConfidenceCap", "fieldBudgetSeal", "blockedClaims"]) {
  if (!pass428.includes(marker)) throw new Error(`PASS428 coherence marker missing ${marker}`);
}
if (/NEXT_PUBLIC_.*ANGEL/.test(pass428)) throw new Error("PASS428 must not expose Angel/API keys to client env.");
if (!pass428.includes("visibleSuggestionLimit: 3")) throw new Error("PASS428 Lens lock must preserve 3 visible suggestions.");
if (!pass428.includes("Basic, Pro and Advanced")) throw new Error("PASS428 must preserve shared truth source across tiers.");

const lens = read("lib/search/lens-report.ts");
if (!lens.includes("pass428: Pass428LensNarrativeCoherenceLock")) throw new Error("Lens report must expose PASS428 coherence lock.");
if (!lens.includes("buildPass428LensNarrativeCoherenceLock")) throw new Error("Lens report must build PASS428 coherence lock.");

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

console.log(`PASS428 brain narrative coherence runtime verified · ${parsed} TS/TSX parsed`);
