import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
const required = [
  ["lib/market-integrity/pass435-live-query-test-bench.ts", "pass435-live-query-test-bench"],
  ["lib/market-integrity/pass435-live-query-test-bench.ts", "buildPass435LiveQueryTestBench"],
  ["lib/market-integrity/pass435-live-query-test-bench.ts", "fakeLiveRisk"],
  ["lib/market-integrity/pass435-live-query-test-bench.ts", "missingDataReplay"],
  ["lib/market-integrity/pass435-live-query-test-bench.ts", "noSecondCopyGenerator"],
  ["lib/market-integrity/risk-brain.ts", "PASS435 live query test bench"],
  ["lib/market-integrity/risk-brain.ts", "pass435,"],
  ["lib/search/lens-report.ts", "Pass435LensLiveQueryContract"],
  ["lib/search/lens-report.ts", "pass435,"],
  ["app/api/market-integrity/probe/route.ts", "buildPass435LiveQueryTestBench"],
  ["app/api/market-integrity/probe/route.ts", "liveQueryTestBench: pass435"],
  ["app/api/market-integrity/analyze/route.ts", "pass435: brain.pass435"],
  ["app/api/market-integrity/brain/route.ts", "pass435: brain.pass435"],
  ["app/api/market-integrity/chat/route.ts", "pass435: brain.pass435"],
  ["app/api/market-integrity/angel/route.ts", "pass435: brain.pass435"],
  ["scripts/probe-pass435-live-query-test-bench.mjs", "PASS435 live query test bench"],
  ["VELMERE_PASS435_LIVE_QUERY_TEST_BENCH_REPORT.md", "PASS435"],
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
const core = read("lib/market-integrity/pass435-live-query-test-bench.ts");
for (const marker of ["release_live_readout", "release_partial_with_missing", "facts_only_no_live_claim", "block_pdf_until_probe", "onePayload", "maxMissingItemsInCustomerPdf"]) {
  if (!core.includes(marker)) throw new Error(`PASS435 core missing ${marker}`);
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
console.log(`PASS435 live query test bench verified · ${parsed} TS/TSX parsed`);
