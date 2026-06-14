import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "pass433-real-internet-data-arbitration"],
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "buildPass433RealInternetDataArbitration"],
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "buildPass433ProviderProbeFromRiskResult"],
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "missingDataHunt"],
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "noFakeLiveEnvelope"],
  ["lib/market-integrity/pass433-real-internet-data-arbitration.ts", "real_internet_confirmed"],
  ["lib/market-integrity/risk-brain.ts", "PASS433 internet arbitration"],
  ["lib/market-integrity/risk-brain.ts", "pass433,"],
  ["lib/search/lens-report.ts", "Pass433LensRealDataContract"],
  ["lib/search/lens-report.ts", "pass433,"],
  ["app/api/market-integrity/probe/route.ts", "market-probe-pass433"],
  ["app/api/market-integrity/probe/route.ts", "providerAttempts"],
  ["app/api/market-integrity/probe/route.ts", "arbitration: pass433"],
  ["app/api/market-integrity/analyze/route.ts", "pass433: brain.pass433"],
  ["app/api/market-integrity/brain/route.ts", "pass433: brain.pass433"],
  ["app/api/market-integrity/chat/route.ts", "pass433: brain.pass433"],
  ["app/api/market-integrity/angel/route.ts", "pass433: brain.pass433"],
  ["scripts/probe-pass433-real-internet-data.mjs", "PASS433 real internet data arbitration"],
  ["scripts/probe-pass433-real-internet-data.mjs", "probeCoinGecko"],
  ["scripts/probe-pass433-real-internet-data.mjs", "probeDexScreener"],
  ["scripts/probe-pass433-real-internet-data.mjs", "probeYahoo"],
  ["VELMERE_PASS433_REAL_INTERNET_DATA_ARBITRATION_REPORT.md", "PASS433"],
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
const core = read("lib/market-integrity/pass433-real-internet-data-arbitration.ts");
for (const marker of ["cross_source_conflict", "missing_data_hunt", "sealed_no_fake_live", "publicConfidenceCap", "localProbeCommand", "releaseChecklist"]) {
  if (!core.includes(marker)) throw new Error(`PASS433 core missing ${marker}`);
}
const probeRoute = read("app/api/market-integrity/probe/route.ts");
if (!probeRoute.includes("CoinGecko markets") || !probeRoute.includes("DEX Screener + GoPlus")) {
  throw new Error("PASS433 route must actively try CoinGecko and DEX Screener/GoPlus paths.");
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
console.log(`PASS433 real internet data arbitration verified · ${parsed} TS/TSX parsed`);
