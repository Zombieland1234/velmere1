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
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "pass430-brain-answer-verifier-runtime"],
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "buildPass430BrainAnswerVerifierRuntime"],
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "buildPass430LensAnswerProofContract"],
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "memoryCannotOverrideLiveSources: true"],
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "noSentienceClaim: true"],
  ["lib/market-integrity/pass430-brain-answer-verifier-runtime.ts", "noBuySellInstruction: true"],
  ["lib/market-integrity/risk-brain.ts", "PASS430 answer verifier"],
  ["lib/market-integrity/risk-brain.ts", "pass430,"],
  ["lib/search/lens-report.ts", "Pass430LensAnswerProofContract"],
  ["lib/search/lens-report.ts", "pass430,"],
  ["app/api/market-integrity/analyze/route.ts", "pass430: brain.pass430"],
  ["app/api/market-integrity/brain/route.ts", "pass430: brain.pass430"],
  ["app/api/market-integrity/chat/route.ts", "pass430: brain.pass430"],
  ["app/api/market-integrity/angel/route.ts", "pass430: brain.pass430"],
  ["VELMERE_PASS430_BRAIN_ANSWER_VERIFIER_RUNTIME_REPORT.md", "PASS430"],
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

const pass430 = read("lib/market-integrity/pass430-brain-answer-verifier-runtime.ts");
for (const marker of ["proofState", "responseMode", "answerReadinessScore", "proofChecklist", "proofLedger", "memoryLearningFence", "blockedClaims"]) {
  if (!pass430.includes(marker)) throw new Error(`PASS430 answer verifier marker missing ${marker}`);
}
if (/NEXT_PUBLIC_.*ANGEL|NEXT_PUBLIC_.*AI|NEXT_PUBLIC_.*KEY/.test(pass430)) {
  throw new Error("PASS430 must not expose AI/provider keys to client env.");
}
if (!pass430.includes("visibleSuggestionLimit: 3")) throw new Error("PASS430 Lens contract must preserve 3 visible suggestions.");
if (!pass430.includes("noTechnicalCustomerCopy: true")) throw new Error("PASS430 Lens contract must keep technical payload language out of customer UI.");
if (!pass430.includes("memoryCannotOverrideLiveSources: true")) throw new Error("PASS430 must keep long memory below live source proof.");

const riskBrain = read("lib/market-integrity/risk-brain.ts");
if (!riskBrain.includes("buildPass430BrainAnswerVerifierRuntime")) throw new Error("Risk brain must build PASS430.");
if (!riskBrain.includes("pass430,")) throw new Error("Risk brain must return PASS430.");

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

console.log(`PASS430 brain answer verifier runtime verified · ${parsed} TS/TSX parsed`);
