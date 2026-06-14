import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();

const required = [
  ["lib/market-integrity/pass432-live-data-probe-runtime.ts", "pass432-live-data-probe-runtime"],
  ["lib/market-integrity/pass432-live-data-probe-runtime.ts", "buildPass432LiveDataProbeRuntime"],
  ["lib/market-integrity/pass432-live-data-probe-runtime.ts", "buildPass432LensDataTruthContract"],
  ["lib/market-integrity/pass432-live-data-probe-runtime.ts", "noFakeLiveRule: true"],
  ["lib/market-integrity/risk-brain.ts", "PASS432 live data probe"],
  ["lib/market-integrity/risk-brain.ts", "pass432,"],
  ["lib/search/lens-report.ts", "Pass432LensDataTruthContract"],
  ["lib/search/lens-report.ts", "pass432,"],
  ["lib/search/lens-report.ts", "buildPass431LensCriticContract({"],
  ["app/api/market-integrity/analyze/route.ts", "pass432: brain.pass432"],
  ["app/api/market-integrity/brain/route.ts", "pass432: brain.pass432"],
  ["app/api/market-integrity/chat/route.ts", "pass432: brain.pass432"],
  ["app/api/market-integrity/angel/route.ts", "pass432: brain.pass432"],
  ["app/api/market-integrity/probe/route.ts", "mode: \"live_probe\""],
  ["app/api/market-integrity/probe/route.ts", "sampleReadout"],
  ["scripts/probe-pass432-live-data.mjs", "PASS432 live data probe"],
  ["scripts/probe-pass432-live-data.mjs", "CoinGecko"],
  ["scripts/probe-pass432-live-data.mjs", "Yahoo Finance chart"],
  ["VELMERE_PASS432_LIVE_DATA_PROBE_RUNTIME_REPORT.md", "PASS432"],
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
  const text = read(file);
  if (!text.includes(marker)) throw new Error(`Missing marker ${marker} in ${file}`);
}

const lens = read("lib/search/lens-report.ts");
if (/buildPass431LensCriticContract\(\{[\s\S]{0,160}pass431,/.test(lens)) {
  throw new Error("Lens report still passes pass431 into its own builder before initialization.");
}
if (!lens.includes("previewDownloadSamePayload: true") && !read("lib/market-integrity/pass432-live-data-probe-runtime.ts").includes("previewDownloadSamePayload: true")) {
  throw new Error("PASS432 Lens must preserve preview/download same-payload contract.");
}

const core = read("lib/market-integrity/pass432-live-data-probe-runtime.ts");
for (const marker of ["real_market_payload", "partial_provider_payload", "demo_or_fixture_payload", "sealed_unverified_payload", "sampleReadout", "providerReality", "analysisTruthChecklist", "realDataRepairPlan", "queryProbeContract"]) {
  if (!core.includes(marker)) throw new Error(`PASS432 core marker missing ${marker}`);
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
console.log(`PASS432 live data probe runtime verified · ${parsed} TS/TSX parsed`);
