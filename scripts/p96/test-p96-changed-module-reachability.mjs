#!/usr/bin/env node
import { createRequire } from "node:module";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const candidates = [
  path.resolve(path.dirname(process.execPath), "../lib/node_modules/typescript/lib/typescript.js"),
  path.resolve(path.dirname(process.execPath), "../../lib/node_modules/typescript/lib/typescript.js"),
];
let ts = null;
for (const candidate of candidates) { try { await access(candidate); ts = require(candidate); break; } catch { /* Probe the next canonical TypeScript location. */ } }
if (!ts) throw new Error("global_typescript_unavailable_for_p96_transpile");

const checks = [];
function check(id, condition, detail) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error(`P96 reachability failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
const alignment = await import("../../lib/market-integrity/risk-history-current-alignment.ts");
const binding = await import("../../lib/market-integrity/risk-history-customer-request-binding.ts");
const contract = await import("../../lib/market-integrity/risk-history-contract.ts");
const ledger = await import("../../lib/market-integrity/risk-ledger.ts");
const route = await import("../../lib/server/market-integrity-route-modules/history.ts");
const client = await import("../../lib/market-integrity/risk-history-customer-client.ts");
check("alignment_builder_import", typeof alignment.buildRiskHistoryCurrentObservation === "function");
check("alignment_adjudicator_import", typeof alignment.alignRiskHistoryCurrentObservation === "function");
check("request_binding_builder_import", typeof binding.buildRiskHistoryCustomerRequestBinding === "function");
check("page_storage_proof_builder_import", typeof contract.buildCustomerSafeRiskHistoryPageStorageProof === "function");
check("ledger_public_resolution_import", typeof ledger.getPublicRiskHistoryResolution === "function");
check("route_v3_get_import", typeof route.GET === "function" && route.RISK_HISTORY_PUBLIC_ROUTE_SCHEMA === "velmere.risk-history.customer-route.v3");
check("client_v3_import", typeof client.parseRiskHistoryCustomerPayload === "function" && client.RISK_HISTORY_CUSTOMER_ROUTE_SCHEMA === "velmere.risk-history.customer-route.v3");

const files = [
  ["current_alignment", "lib/market-integrity/risk-history-current-alignment.ts", ts.ScriptKind.TS],
  ["request_binding", "lib/market-integrity/risk-history-customer-request-binding.ts", ts.ScriptKind.TS],
  ["contract", "lib/market-integrity/risk-history-contract.ts", ts.ScriptKind.TS],
  ["customer_client", "lib/market-integrity/risk-history-customer-client.ts", ts.ScriptKind.TS],
  ["route", "lib/server/market-integrity-route-modules/history.ts", ts.ScriptKind.TS],
  ["risk_history_control", "components/market-integrity/RiskHistoryControl.tsx", ts.ScriptKind.TSX],
  ["shield_real_markets_parity", "components/market-integrity/ShieldRealMarketsParityClient.tsx", ts.ScriptKind.TSX],
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
  schemaVersion: "velmere.p96.changed-module-reachability.v1",
  generatedAt: "2026-08-21T05:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: { reactRuntimeExecuted: false, browserRendered: false, realDatabaseExecuted: false, wholeProjectTypeScript: false, eslint: false, build: false, customerFinal: "0/20" },
  truthBoundary: "Six current server/client entry points import and seven integrated production modules transpile. This does not prove React runtime, Browser rendering, PostgreSQL, whole-project semantic TypeScript, lint, build, exact Windows or Customer FINAL.",
};
for (const relative of ["receipts/p96/P96_CHANGED_MODULE_REACHABILITY.json", "artifacts/p96/P96_CHANGED_MODULE_REACHABILITY.json"]) {
  const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }, null, 2));
if (failed.length) process.exitCode = 1;
