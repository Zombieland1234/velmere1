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
  ["lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts", "pass429-brain-self-audit-consensus-runtime"],
  ["lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts", "buildPass429BrainSelfAuditConsensusRuntime"],
  ["lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts", "buildPass429LensSelfAuditContract"],
  ["lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts", "noSentienceClaim: true"],
  ["lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts", "noBuySellInstruction: true"],
  ["lib/market-integrity/risk-brain.ts", "PASS429 self-audit consensus"],
  ["lib/market-integrity/risk-brain.ts", "pass429,"],
  ["lib/search/lens-report.ts", "Pass429LensSelfAuditContract"],
  ["lib/search/lens-report.ts", "pass429,"],
  ["app/api/market-integrity/analyze/route.ts", "pass429: brain.pass429"],
  ["app/api/market-integrity/brain/route.ts", "pass429: brain.pass429"],
  ["app/api/market-integrity/chat/route.ts", "pass429: brain.pass429"],
  ["app/api/market-integrity/angel/route.ts", "pass429: brain.pass429"],
  ["VELMERE_PASS429_BRAIN_SELF_AUDIT_CONSENSUS_RUNTIME_REPORT.md", "PASS429"],
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

const pass429 = read("lib/market-integrity/pass429-brain-self-audit-consensus-runtime.ts");
for (const marker of ["answerMode", "consensusState", "selfAuditChecks", "confidenceEnvelope", "evidenceCoverage", "memoryLearningGate", "blockedPhrases"]) {
  if (!pass429.includes(marker)) throw new Error(`PASS429 self-audit marker missing ${marker}`);
}
if (/NEXT_PUBLIC_.*ANGEL|NEXT_PUBLIC_.*AI|NEXT_PUBLIC_.*KEY/.test(pass429)) {
  throw new Error("PASS429 must not expose AI/provider keys to client env.");
}
if (!pass429.includes("visibleSuggestionLimit: 3")) throw new Error("PASS429 Lens contract must preserve 3 visible suggestions.");
if (!pass429.includes("blockedTechnicalCopy")) throw new Error("PASS429 Lens contract must block technical payload copy in customer UI.");
if (!pass429.includes("evidenceBeforeNarrative: true")) throw new Error("PASS429 must enforce evidence before narrative.");

const riskBrain = read("lib/market-integrity/risk-brain.ts");
if (!riskBrain.includes("buildPass429BrainSelfAuditConsensusRuntime")) throw new Error("Risk brain must build PASS429.");
if (!riskBrain.includes("pass429,")) throw new Error("Risk brain must return PASS429.");

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

console.log(`PASS429 brain self-audit consensus runtime verified · ${parsed} TS/TSX parsed`);
