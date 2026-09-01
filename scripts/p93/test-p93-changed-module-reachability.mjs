#!/usr/bin/env node
import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(import.meta.url);
const candidates = [
  path.resolve(path.dirname(process.execPath), "../lib/node_modules/typescript/lib/typescript.js"),
  path.resolve(path.dirname(process.execPath), "../../lib/node_modules/typescript/lib/typescript.js"),
];
let ts = null;
for (const candidate of candidates) {
  try { await access(candidate); ts = require(candidate); break; } catch { /* Probe the next canonical TypeScript location. */ }
}
if (!ts) throw new Error("global_typescript_unavailable_for_p93_transpile");

const checks = [];
function check(id, condition, detail) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error(`P93 reachability failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
check("contract_public_builder_import", typeof contract.buildPublicCustomerRiskHistoryProjection === "function");
check("ledger_resolution_import", typeof ledger.getPersistentRiskHistoryResolution === "function");
check("ledger_shared_reader_import", typeof ledger.getPersistentRiskHistoryEvents === "function" && typeof ledger.getPersistentRiskHistory === "function");
check("route_get_import", typeof route.GET === "function");

const files = [
  ["risk_history_contract", "lib/market-integrity/risk-history-contract.ts", ts.ScriptKind.TS],
  ["risk_history_ledger", "lib/market-integrity/risk-ledger.ts", ts.ScriptKind.TS],
  ["risk_history_route", "lib/server/market-integrity-route-modules/history.ts", ts.ScriptKind.TS],
  ["risk_history_control_copy", "components/market-integrity/RiskHistoryControl.tsx", ts.ScriptKind.TSX],
];
for (const [id, relative, _scriptKind] of files) {
  const source = await readFile(path.join(root, relative), "utf8");
  const result = ts.transpileModule(source, {
    fileName: relative,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      sourceMap: false,
    },
  });
  const errors = (result.diagnostics ?? []).filter((row) => row.category === ts.DiagnosticCategory.Error);
  check(`${id}_transpile`, errors.length === 0, errors.map((row) => ts.flattenDiagnosticMessageText(row.messageText, "\n")));
  check(`${id}_output_nonempty`, result.outputText.length > Math.min(200, source.length / 5), result.outputText.length);
}

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p93.changed-module-reachability.v1",
  generatedAt: "2026-08-20T12:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: {
    reactRuntimeExecuted: false,
    browserRendered: false,
    realDatabaseExecuted: false,
    wholeProjectTypeScript: false,
    eslint: false,
    build: false,
    customerFinal: "0/20",
  },
  truthBoundary: "The server/core entry points, including the shared cross-product canonical reader, import through the offline loader and four changed production modules transpile without syntax diagnostics. This is not React runtime, Browser, PostgreSQL, whole-project semantic TypeScript, lint, build or Customer FINAL proof.",
};
for (const relative of ["receipts/p93/P93_CHANGED_MODULE_REACHABILITY.json", "artifacts/p93/P93_CHANGED_MODULE_REACHABILITY.json"]) {
  const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
