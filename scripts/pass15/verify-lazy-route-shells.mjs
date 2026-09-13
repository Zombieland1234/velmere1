#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readVerifiedRouteAstFreezeV2 } from "./verified-route-ast-freeze-v2.mjs";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "config/pass15/lazy-route-shell-manifest.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, "config/pass15/lazy-build-surface-profile.json"), "utf8"));
const profileByRoute = new Map(profile.wrappedRoutes.map((row) => [row.route, row]));
const checks = [];
const failures = [];
const advisoryMismatches = [];
function sha(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
const { registry: routeAstRegistry, rowsByPath: routeAstRows } = readVerifiedRouteAstFreezeV2({ root });
function astRow(relativePath) {
  const row = routeAstRows.get(relativePath);
  if (!row) throw new Error(`route_ast_registry_row_missing:${relativePath}`);
  return row;
}
function check(name, ok, detail = undefined, { blocking = true, authority = "LAZY_ROUTE_SHELL_CONTRACT" } = {}) {
  const row = { name, ok, blocking, authority, ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!ok && blocking) failures.push({ name, detail, authority });
  if (!ok && !blocking) advisoryMismatches.push({ name, detail, authority });
}
for (const route of manifest.routes) {
  const shell = path.join(root, route.route);
  const handler = path.join(root, route.handlerModule);
  check(`${route.route}:shell_exists`, fs.existsSync(shell));
  check(`${route.route}:handler_exists`, fs.existsSync(handler));
  if (!fs.existsSync(shell) || !fs.existsSync(handler)) continue;
  const shellText = fs.readFileSync(shell, "utf8");
  const handlerText = fs.readFileSync(handler, "utf8");
  const shellAst = astRow(route.route);
  const handlerAst = astRow(route.handlerModule);
  check(`${route.route}:shell_methods`, JSON.stringify(shellAst.methods) === JSON.stringify([...route.methods].sort()), { expected: route.methods, actual: shellAst.methods }, { authority: "EXACT_AST_FREEZE_V2" });
  check(`${route.route}:handler_methods`, JSON.stringify(handlerAst.methods) === JSON.stringify([...route.methods].sort()), { expected: route.methods, actual: handlerAst.methods }, { authority: "EXACT_AST_FREEZE_V2" });
  check(`${route.route}:lazy_loader`, shellText.includes("invokeLazyRouteHandler") && shellText.includes(`import("@/${route.handlerModule.replace(/\.ts$/u, "")}")`));
  check(`${route.route}:handler_no_route_config`, !/export\s+const\s+(?:runtime|dynamic|maxDuration|revalidate|preferredRegion|fetchCache|dynamicParams)\s*=/u.test(handlerText));
  const currentHandlerSha = sha(handler);
  check(
    `${route.route}:legacy_handler_hash_metadata`,
    currentHandlerSha === route.handlerSha256,
    {
      expectedLegacy: route.handlerSha256,
      actual: currentHandlerSha,
      authoritativeAstSha256: handlerAst.sha256,
      note: "Legacy duplicate handler hash is advisory only; exact source integrity is blocking through PASS15 AST freeze v2.",
    },
    { blocking: false, authority: "LEGACY_DUPLICATE_METADATA" },
  );
  check(`${route.route}:no_old_relative_lib_import`, !handlerText.includes('"../../../../lib/') && !handlerText.includes("'../../../../lib/"));
  const profiled = profileByRoute.get(route.route);
  check(`${route.route}:profiled`, Boolean(profiled?.after));
  if (profiled?.after) {
    check(`${route.route}:eager_bytes_reduced`, profiled.after.eagerBytes < route.beforeEagerBytes, { before: route.beforeEagerBytes, after: profiled.after.eagerBytes });
    check(`${route.route}:eager_files_reduced`, profiled.after.eagerFiles < route.beforeEagerFiles, { before: route.beforeEagerFiles, after: profiled.after.eagerFiles });
  }
}
const result = {
  schemaVersion: "velmere.pass15.lazy-route-shell-verification.v2",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Blocking lazy-shell verification uses PASS15 exact current-source TypeScript AST freeze v2 for shell/handler method and source binding plus lazy-loader/import, route-config, profile and eager-surface checks. Historical handlerSha256 fields are retained only as visible advisory legacy metadata and cannot supply authority. Runtime parity still requires exact production build and E2E.",
  summary: {
    routes: manifest.routes.length,
    checks: checks.length,
    blockingChecks: checks.filter((row) => row.blocking).length,
    blockingPassed: checks.filter((row) => row.blocking && row.ok).length,
    blockingFailed: failures.length,
    advisoryChecks: checks.filter((row) => !row.blocking).length,
    advisoryMismatches: advisoryMismatches.length,
    eagerBytesBefore: profile.wrappedRouteSummary.beforeEagerBytes,
    eagerBytesAfter: profile.wrappedRouteSummary.afterEagerBytes,
    eagerByteReduction: profile.wrappedRouteSummary.eagerByteReduction,
    routeAstRegistryFiles: routeAstRegistry.fileCount,
    routeAstRegistryExactCredit: routeAstRegistry.exactAstReparseCredit,
    routeAstFreezeSchemaVersion: routeAstRegistry.freezeSchemaVersion,
    routeAstFreezeDigestSha256: routeAstRegistry.freezeDigestSha256,
    legacyMetadataAuthority: false,
  },
  failures,
  advisoryMismatches,
  checks,
};
const writeEvidence = process.argv.includes("--write-evidence") || process.env.VELMERE_WRITE_EVIDENCE === "1";
const out = writeEvidence
  ? path.join(root, "config/pass15/lazy-route-shell-verification.json")
  : path.join(root, ".velmere/pass15-diagnostics/lazy-route-shell-verification.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (failures.length) process.exit(1);
