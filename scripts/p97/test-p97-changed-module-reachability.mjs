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
if (!ts) throw new Error("global_typescript_unavailable_for_p97_transpile");

const checks = [];
function check(id, condition, detail = undefined) {
  checks.push({ id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) });
  if (!condition) throw new Error(`P97 reachability failed: ${id} ${JSON.stringify(detail ?? null)}`);
}

const policy = await import("../../lib/search/lens-pdf-durable-artifact-policy.ts");
const route = await import("../../lib/server/search-route-modules/lens-report.ts");
const durable = await import("../../lib/jobs/durable-computation-replay.ts");
check("policy_builder_import", typeof policy.buildP97LensPdfDurableArtifactPolicy === "function");
check("policy_verifier_import", typeof policy.verifyP97LensPdfDurableArtifactPolicy === "function");
check("receipt_builder_import", typeof policy.buildP97LensPdfDurabilityReceipt === "function");
check("receipt_verifier_import", typeof policy.verifyP97LensPdfDurabilityReceipt === "function");
check("route_post_import", typeof route.POST === "function");
check("durable_binary_import", typeof durable.runDurableBinaryComputation === "function");

const files = [
  ["policy", "lib/search/lens-pdf-durable-artifact-policy.ts", ts.ScriptKind.TS],
  ["route", "lib/server/search-route-modules/lens-report.ts", ts.ScriptKind.TS],
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
  schemaVersion: "velmere.p97.changed-module-reachability.v1",
  generatedAt: "2026-08-21T08:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_IMPORT_AND_TRANSPILE",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  zeroFakeCredit: { routeInvokedEndToEnd: false, browserRendered: false, realDatabaseExecuted: false, wholeProjectTypeScript: false, eslint: false, build: false, exactWindows: false, customerFinal: "0/20" },
  truthBoundary: "Imports the current Browser Lens POST route and policy helpers through the canonical offline loader and transpiles both changed production files. This is not a live Next.js route, Browser, Supabase, whole-project TypeScript, build, exact-Windows or Customer FINAL proof.",
};
for (const relative of ["receipts/p97/P97_CHANGED_MODULE_REACHABILITY.json", "artifacts/p97/P97_CHANGED_MODULE_REACHABILITY.json"]) {
  const target = path.join(root, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }));
if (failed.length) process.exitCode = 1;
