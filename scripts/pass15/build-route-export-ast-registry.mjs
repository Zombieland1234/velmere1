#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildRouteAstRegistryCore,
  discoverRouteAstPaths,
  loadTypeScriptForRouteAst,
  parseRouteModuleAst,
  withRouteAstRegistryDigest,
} from "./route-module-ast.mjs";

const root = process.cwd();
const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const output = path.resolve(root, argumentValue("--output") ?? "config/pass15/route-export-ast-registry.json");
const revisionId = argumentValue("--revision") ?? JSON.parse(fs.readFileSync("config/pass36/current-release-authority.json", "utf8")).authorityRevisionId;
const generatedAt = argumentValue("--generated-at") ?? JSON.parse(fs.readFileSync("config/pass36/a94r1-action-required-current-state.json", "utf8")).generatedAt;
const { ts, provenance } = await loadTypeScriptForRouteAst({ root });
const paths = discoverRouteAstPaths({ root });
const rows = paths.map((relativePath) => parseRouteModuleAst({ ts, root, relativePath }));
const invalid = rows.filter((row) => !row.astEligible || row.methods.length === 0);
if (invalid.length) {
  throw new Error(`route_ast_registry_invalid_rows:${JSON.stringify(invalid.map((row) => ({ path: row.path, methods: row.methods, parseDiagnostics: row.parseDiagnostics, duplicateMethods: row.duplicateMethods, exportStarCount: row.exportStarCount })))}`);
}
const registry = withRouteAstRegistryDigest(
  buildRouteAstRegistryCore({ revisionId, generatedAt, parser: provenance, rows }),
);
fs.mkdirSync(path.dirname(output), { recursive: true });
const temporary = `${output}.tmp-${process.pid}`;
try {
  fs.writeFileSync(temporary, `${JSON.stringify(registry, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  fs.renameSync(temporary, output);
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
console.log(JSON.stringify({
  schemaVersion: "velmere.pass15.route-export-ast-registry-build.v1",
  status: provenance.exactToolchainCreditEligible ? "PASS_EXACT_PROJECT_TYPESCRIPT_AST_REGISTRY" : "PASS_DIAGNOSTIC_EXTERNAL_TYPESCRIPT_AST_REGISTRY_NO_EXACT_CREDIT",
  output: path.relative(root, output).split(path.sep).join("/"),
  revisionId,
  parser: provenance,
  fileCount: registry.fileCount,
  methodExportCount: registry.methodExportCount,
  registryDigestSha256: registry.registryDigestSha256,
  exactAstReparseCredit: registry.exactAstReparseCredit,
}, null, 2));
