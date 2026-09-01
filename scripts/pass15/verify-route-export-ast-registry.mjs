#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  loadTypeScriptForRouteAst,
  parseRouteModuleAst,
  readVerifiedRouteAstRegistry,
} from "./route-module-ast.mjs";

const root = process.cwd();
const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const registryPath = argumentValue("--registry") ?? "config/pass15/route-export-ast-registry.json";
const { registry } = readVerifiedRouteAstRegistry({ root, registryPath });
const reparseRequested = process.argv.includes("--reparse");
const checks = [];
const failures = [];
const record = (id, passed, detail = null) => {
  checks.push({ id, passed: Boolean(passed), detail });
  if (!passed) failures.push({ id, detail });
};
record("registry:digest-and-current-bytes", true, registry.registryDigestSha256);
record("registry:all-rows-have-methods", registry.rows.every((row) => row.methods.length > 0));
record("registry:no-star-reexports", registry.rows.every((row) => row.exportStarCount === 0));
record("registry:no-duplicate-method-exports", registry.rows.every((row) => row.duplicateMethods.length === 0));
record("registry:no-parse-diagnostics", registry.rows.every((row) => row.parseDiagnostics.length === 0));
let reparse = {
  requested: reparseRequested,
  executed: false,
  exactToolchainCreditEligible: false,
  parser: null,
  rows: 0,
};
if (reparseRequested) {
  const { ts, provenance } = await loadTypeScriptForRouteAst({ root });
  reparse = { requested: true, executed: true, exactToolchainCreditEligible: provenance.exactToolchainCreditEligible, parser: provenance, rows: registry.rows.length };
  for (const declared of registry.rows) {
    const observed = parseRouteModuleAst({ ts, root, relativePath: declared.path });
    record(`${declared.path}:ast-method-equivalence`, canonicalJson(observed.methods) === canonicalJson(declared.methods), { declared: declared.methods, observed: observed.methods });
    record(`${declared.path}:ast-route-config-equivalence`, canonicalJson(observed.routeConfig) === canonicalJson(declared.routeConfig), { declared: declared.routeConfig, observed: observed.routeConfig });
    record(`${declared.path}:ast-source-binding`, observed.sha256 === declared.sha256 && observed.byteLength === declared.byteLength);
    record(`${declared.path}:ast-clean-parse`, observed.astEligible === true, { diagnostics: observed.parseDiagnostics, duplicates: observed.duplicateMethods, exportStarCount: observed.exportStarCount });
  }
}
const result = {
  schemaVersion: "velmere.pass15.route-export-ast-registry-verification.v1",
  status: failures.length
    ? "FAIL_ROUTE_EXPORT_AST_REGISTRY"
    : reparse.executed
      ? reparse.exactToolchainCreditEligible
        ? "PASS_ROUTE_EXPORT_AST_REGISTRY_EXACT_REPARSE"
        : "PASS_ROUTE_EXPORT_AST_REGISTRY_DIAGNOSTIC_REPARSE_NO_EXACT_CREDIT"
      : "PASS_ROUTE_EXPORT_AST_REGISTRY_STATIC_REPLAY_NO_REPARSE_CREDIT",
  revisionId: registry.revisionId,
  registryPath,
  checks: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  failures,
  fileCount: registry.fileCount,
  methodExportCount: registry.methodExportCount,
  reparse,
  truthBoundary: registry.truthBoundary,
  exactBuildBrowserCredit: false,
  liveProven: false,
  saleEnabled: false,
};
const output = argumentValue("--output");
if (output) {
  const absoluteOutput = path.resolve(root, output);
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
