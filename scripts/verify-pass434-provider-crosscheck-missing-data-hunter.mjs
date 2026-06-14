import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts", "pass434-provider-crosscheck-missing-data-hunter"],
  ["lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts", "buildPass434ProviderCrosscheckMissingDataHunter"],
  ["lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts", "missingDataHunter"],
  ["lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts", "noFakeLive"],
  ["lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts", "providerLaneScores"],
  ["lib/market-integrity/risk-brain.ts", "PASS434 provider crosscheck"],
  ["lib/market-integrity/risk-brain.ts", "pass434,"],
  ["lib/search/lens-report.ts", "Pass434LensProviderCrosscheckContract"],
  ["lib/search/lens-report.ts", "pass434,"],
  ["app/api/market-integrity/probe/route.ts", "buildPass434ProviderCrosscheckMissingDataHunter"],
  ["app/api/market-integrity/probe/route.ts", "Binance spot klines"],
  ["app/api/market-integrity/probe/route.ts", "Yahoo Finance chart unofficial"],
  ["app/api/market-integrity/probe/route.ts", "providerCrosscheck: pass434"],
  ["app/api/market-integrity/analyze/route.ts", "pass434: brain.pass434"],
  ["app/api/market-integrity/brain/route.ts", "pass434: brain.pass434"],
  ["app/api/market-integrity/chat/route.ts", "pass434: brain.pass434"],
  ["app/api/market-integrity/angel/route.ts", "pass434: brain.pass434"],
  ["scripts/probe-pass434-provider-crosscheck.mjs", "PASS434 provider crosscheck"],
  ["scripts/probe-pass434-provider-crosscheck.mjs", "probeBinanceKlines"],
  ["scripts/probe-pass434-provider-crosscheck.mjs", "probeYahoo"],
  ["VELMERE_PASS434_PROVIDER_CROSSCHECK_MISSING_DATA_HUNTER_REPORT.md", "PASS434"],
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
const core = read("lib/market-integrity/pass434-provider-crosscheck-missing-data-hunter.ts");
for (const marker of ["release_with_missing_data", "facts_only", "operator_review", "maximumPublicConfidence", "sectionOrder", "probeCommands"]) {
  if (!core.includes(marker)) throw new Error(`PASS434 core missing ${marker}`);
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
console.log(`PASS434 provider crosscheck missing-data hunter verified · ${parsed} TS/TSX parsed`);
