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
if (!ts) throw new Error("global_typescript_unavailable_for_p92_transpile");

const checks = [];
function check(id, condition, detail) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error(`P92 reachability failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
check("customer_client_import", typeof client.parseRiskHistoryCustomerPayload === "function");
check("customer_fetch_import", typeof client.fetchRiskHistoryCustomerPayload === "function");
check("chart_builder_import", typeof client.buildRiskHistoryChartPolyline === "function");

const files = [
  ["risk_history_customer_client", "lib/market-integrity/risk-history-customer-client.ts", ts.ScriptKind.TS],
  ["risk_history_control", "components/market-integrity/RiskHistoryControl.tsx", ts.ScriptKind.TSX],
  ["shield_parent_integration", "components/market-integrity/ShieldRealMarketsParityClient.tsx", ts.ScriptKind.TSX],
  ["real_markets_modal_identity", "components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ts.ScriptKind.TSX],
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
  schemaVersion: "velmere.p92.changed-module-reachability.v1",
  generatedAt: "2026-08-20T20:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: {
    reactRuntimeExecuted: false,
    browserRendered: false,
    wholeProjectTypeScript: false,
    eslint: false,
    build: false,
    customerFinal: "0/20",
  },
  truthBoundary: "The pure customer client imports through the offline loader and all four changed production modules transpile without syntax diagnostics. This is not React runtime, Browser, semantic whole-project TypeScript, lint, build or deployed customer proof.",
};
for (const relative of ["receipts/p92/P92_CHANGED_MODULE_REACHABILITY.json", "artifacts/p92/P92_CHANGED_MODULE_REACHABILITY.json"]) {
  const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
