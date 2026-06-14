import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass439-truth-replay-harness-runtime.ts", "pass439-truth-replay-harness-runtime"],
  ["lib/market-integrity/pass439-truth-replay-harness-runtime.ts", "buildPass439TruthReplayHarnessRuntime"],
  ["lib/market-integrity/pass439-truth-replay-harness-runtime.ts", "truthReplayNodes"],
  ["lib/market-integrity/pass439-truth-replay-harness-runtime.ts", "replayEveryCustomerClaim"],
  ["lib/market-integrity/pass439-truth-replay-harness-runtime.ts", "neverInventSecondProvider"],
  ["lib/market-integrity/risk-brain.ts", "PASS439 truth replay harness"],
  ["lib/market-integrity/risk-brain.ts", "pass439,"],
  ["lib/search/lens-report.ts", "Pass439LensTruthReplayContract"],
  ["lib/search/lens-report.ts", "pass439,"],
  ["app/api/market-integrity/probe/route.ts", "buildPass439TruthReplayHarnessRuntime"],
  ["app/api/market-integrity/probe/route.ts", "truthReplayHarness: pass439"],
  ["app/api/market-integrity/analyze/route.ts", "pass439: brain.pass439"],
  ["app/api/market-integrity/brain/route.ts", "pass439: brain.pass439"],
  ["app/api/market-integrity/chat/route.ts", "pass439: brain.pass439"],
  ["app/api/market-integrity/angel/route.ts", "pass439: brain.pass439"],
  ["scripts/probe-pass439-truth-replay-harness.mjs", "PASS439 truth replay harness"],
  ["VELMERE_PASS439_TRUTH_REPLAY_HARNESS_REPORT.md", "PASS439"],
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
const core = read("lib/market-integrity/pass439-truth-replay-harness-runtime.ts");
for (const marker of ["replay_clean", "replay_partial", "replay_conflict", "replay_sealed", "blockUnsupportedLiveLanguage", "onePayload", "noFakeLive", "truthReplayNodes"]) {
  if (!core.includes(marker)) throw new Error(`PASS439 core missing ${marker}`);
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
console.log(`PASS439 truth replay harness runtime verified · ${parsed} TS/TSX parsed`);
