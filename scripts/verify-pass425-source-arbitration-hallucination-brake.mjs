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
  ["lib/market-integrity/pass425-source-arbitration-hallucination-brake.ts", "pass425-source-arbitration-hallucination-brake"],
  ["lib/market-integrity/pass425-source-arbitration-hallucination-brake.ts", "hallucinationBrake"],
  ["lib/market-integrity/pass425-source-arbitration-hallucination-brake.ts", "memoryWritePolicy"],
  ["lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts", "pass425"],
  ["lib/market-integrity/risk-brain.ts", "PASS425 arbitration"],
  ["lib/search/lens-report.ts", "buildPass425LensNarrativeContract"],
  ["app/api/search/lens-report/route.ts", "getSection(report"],
  ["app/api/market-integrity/analyze/route.ts", "pass425: brain.pass425"],
  ["VELMERE_PASS425_SOURCE_ARBITRATION_HALLUCINATION_BRAKE_REPORT.md", "PASS425"],
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

const pass422 = read("lib/market-integrity/pass422-brain-memory-anti-overfit-core.ts");
if (/buildPass424BrainErrorCorrectionCore\(\{(?:(?!\n  \}\);)[\s\S])*pass425,/.test(pass422)) {
  throw new Error("PASS425 must not be passed into PASS424 construction before it exists.");
}
if (!pass422.includes("PASS425 claim filters block")) {
  throw new Error("PASS422 anti-overfit rules do not mention PASS425 claim filters.");
}

const lens = read("lib/search/lens-report.ts");
for (const marker of ["buildPass425LensNarrativeContract", "pass425", "same_payload_same_locale_same_sections"]) {
  if (!lens.includes(marker)) throw new Error(`Lens PASS425 contract missing ${marker}`);
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

console.log(`PASS425 source arbitration hallucination brake verified · ${parsed} TS/TSX parsed`);
