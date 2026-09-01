#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readVerifiedRouteAstRegistry } from "./route-module-ast.mjs";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "config/pass15/lazy-route-shell-manifest.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, "config/pass15/lazy-build-surface-profile.json"), "utf8"));
const profileByRoute = new Map(profile.wrappedRoutes.map((row) => [row.route, row]));
const checks = [];
const failures = [];
function sha(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
const { registry: routeAstRegistry, rowsByPath: routeAstRows } = readVerifiedRouteAstRegistry({ root });
function methods(relativePath) {
  const row = routeAstRows.get(relativePath);
  if (!row) throw new Error(`route_ast_registry_row_missing:${relativePath}`);
  return row.methods;
}
function check(name, ok, detail = undefined) {
  checks.push({ name, ok, ...(detail === undefined ? {} : { detail }) });
  if (!ok) failures.push({ name, detail });
}
for (const route of manifest.routes) {
  const shell = path.join(root, route.route);
  const handler = path.join(root, route.handlerModule);
  check(`${route.route}:shell_exists`, fs.existsSync(shell));
  check(`${route.route}:handler_exists`, fs.existsSync(handler));
  if (!fs.existsSync(shell) || !fs.existsSync(handler)) continue;
  const shellText = fs.readFileSync(shell, "utf8");
  const handlerText = fs.readFileSync(handler, "utf8");
  check(`${route.route}:shell_methods`, JSON.stringify(methods(route.route)) === JSON.stringify([...route.methods].sort()), { expected: route.methods, actual: methods(route.route) });
  check(`${route.route}:handler_methods`, JSON.stringify(methods(route.handlerModule)) === JSON.stringify([...route.methods].sort()), { expected: route.methods, actual: methods(route.handlerModule) });
  check(`${route.route}:lazy_loader`, shellText.includes("invokeLazyRouteHandler") && shellText.includes(`import("@/${route.handlerModule.replace(/\.ts$/u, "")}")`));
  check(`${route.route}:handler_no_route_config`, !/export\s+const\s+(?:runtime|dynamic|maxDuration|revalidate|preferredRegion|fetchCache|dynamicParams)\s*=/u.test(handlerText));
  check(`${route.route}:handler_hash`, sha(handler) === route.handlerSha256, { expected: route.handlerSha256, actual: sha(handler) });
  check(`${route.route}:no_old_relative_lib_import`, !handlerText.includes('"../../../../lib/') && !handlerText.includes("'../../../../lib/"));
  const profiled = profileByRoute.get(route.route);
  check(`${route.route}:profiled`, Boolean(profiled?.after));
  if (profiled?.after) {
    check(`${route.route}:eager_bytes_reduced`, profiled.after.eagerBytes < route.beforeEagerBytes, { before: route.beforeEagerBytes, after: profiled.after.eagerBytes });
    check(`${route.route}:eager_files_reduced`, profiled.after.eagerFiles < route.beforeEagerFiles, { before: route.beforeEagerFiles, after: profiled.after.eagerFiles });
  }
}
const result = {
  schemaVersion: "velmere.pass15.lazy-route-shell-verification.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static source/import verification with a hash-bound TypeScript AST route export registry. Exact AST reparse and runtime parity require the exact A78R1/A79R1 toolchain, production build and E2E.",
  summary: {
    routes: manifest.routes.length,
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
    eagerBytesBefore: profile.wrappedRouteSummary.beforeEagerBytes,
    eagerBytesAfter: profile.wrappedRouteSummary.afterEagerBytes,
    eagerByteReduction: profile.wrappedRouteSummary.eagerByteReduction,
    routeAstRegistryFiles: routeAstRegistry.fileCount,
    routeAstRegistryExactCredit: routeAstRegistry.exactAstReparseCredit,
  },
  failures,
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
