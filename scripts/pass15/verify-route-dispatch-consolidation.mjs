#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readVerifiedRouteAstRegistry } from "./route-module-ast.mjs";

const root = process.cwd();
function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const manifestPath = path.resolve(
  root,
  argumentValue("--manifest") ?? "config/pass15/route-dispatch-manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const a41RecoveryPath = path.join(root, "config/pass35/a41-critical-route-recovery.json");
const a41Recovery = fs.existsSync(a41RecoveryPath)
  ? JSON.parse(fs.readFileSync(a41RecoveryPath, "utf8"))
  : { authorizedDirectRoutes: [] };
const authorizedDirectRoutes = new Set(a41Recovery.authorizedDirectRoutes ?? []);
const groups = ["marketIntegrity", "internalWorkers", "security", "search", "admin"];
const failures = [];
const checks = [];

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function record(name, ok, detail = undefined) {
  checks.push({ name, ok, ...(detail === undefined ? {} : { detail }) });
  if (!ok) failures.push({ name, detail });
}
const { registry: routeAstRegistry, rowsByPath: routeAstRows } = readVerifiedRouteAstRegistry({ root });
function astRow(relativePath) {
  const row = routeAstRows.get(relativePath);
  if (!row) throw new Error(`route_ast_registry_row_missing:${relativePath}`);
  return row;
}
function configCompatibility(routes, dispatcherConfig) {
  const issues = [];
  const original = routes.map((route) => route.routeConfig ?? {});
  if (original.some((row) => row.runtime === '"nodejs"') && dispatcherConfig.runtime !== '"nodejs"') issues.push("runtime_nodejs_not_preserved");
  if (original.some((row) => row.dynamic === '"force-dynamic"') && dispatcherConfig.dynamic !== '"force-dynamic"') issues.push("force_dynamic_not_preserved");
  const maxDurations = original.map((row) => Number(row.maxDuration)).filter(Number.isFinite);
  if (maxDurations.length && Number(dispatcherConfig.maxDuration) < Math.max(...maxDurations)) issues.push("max_duration_reduced");
  if (original.some((row) => row.revalidate === "0") && dispatcherConfig.revalidate !== "0" && dispatcherConfig.dynamic !== '"force-dynamic"') issues.push("revalidate_zero_not_preserved");
  return issues;
}

const publicPaths = new Set();
let routeCount = 0;
for (const groupName of groups) {
  const group = manifest[groupName];
  record(`${groupName}:manifest`, Boolean(group && Array.isArray(group.routes)), group?.routes?.length ?? 0);
  if (!group || !Array.isArray(group.routes)) continue;
  routeCount += group.routes.length;
  const dispatcher = path.join(root, group.dispatcher);
  const registry = path.join(root, group.registry);
  record(`${groupName}:dispatcher_exists`, fs.existsSync(dispatcher), group.dispatcher);
  record(`${groupName}:registry_exists`, fs.existsSync(registry), group.registry);
  const dispatcherText = fs.existsSync(dispatcher) ? fs.readFileSync(dispatcher, "utf8") : "";
  const registryText = fs.existsSync(registry) ? fs.readFileSync(registry, "utf8") : "";
  record(`${groupName}:fail_closed_dispatch`, dispatcherText.includes("dispatchLazyRoute") && dispatcherText.includes("unknownError") && dispatcherText.includes("unavailableError"));
  const dispatcherConfig = fs.existsSync(dispatcher) ? astRow(group.dispatcher).routeConfig : {};
  const configIssues = configCompatibility(group.routes, dispatcherConfig);
  record(`${groupName}:route_config_compatible`, configIssues.length === 0, { dispatcherConfig, issues: configIssues });
  record(`${groupName}:operation_specific_options`, dispatcherText.includes("optionsLazyRoute") && dispatcherText.includes("export async function OPTIONS"));

  const currentDirectRoutes = fs.readdirSync(path.dirname(dispatcher), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
    .map((entry) => path.join(path.dirname(dispatcher), entry.name, "route.ts"))
    .filter((file) => fs.existsSync(file));
  record(`${groupName}:legacy_direct_routes_removed`, currentDirectRoutes.length === 0, currentDirectRoutes.map((file) => path.relative(root, file)));

  for (const route of group.routes) {
    const original = path.join(root, route.originalPath);
    const handler = path.join(root, route.handlerModule);
    const unique = !publicPaths.has(route.publicPath);
    publicPaths.add(route.publicPath);
    record(`${route.publicPath}:unique`, unique);
    const directRouteRecovered = fs.existsSync(original) && authorizedDirectRoutes.has(route.originalPath);
    record(`${route.publicPath}:original_removed_or_a41_recovered`, !fs.existsSync(original) || directRouteRecovered, {
      originalPath: route.originalPath,
      a41Recovered: directRouteRecovered,
    });
    if (directRouteRecovered) {
      const shellText = fs.readFileSync(original, "utf8");
      const expectedImport = `@/${route.handlerModule.replace(/\.ts$/u, "")}`;
      record(`${route.publicPath}:a41_shell_exact_handler_binding`, shellText.includes(expectedImport), expectedImport);
      record(`${route.publicPath}:a41_shell_runtime_contract`, shellText.includes('runtime = "nodejs"') && shellText.includes('dynamic = "force-dynamic"') && shellText.includes("revalidate = 0"));
      record(`${route.publicPath}:a41_shell_no_fixture`, !/fixture|mock|synthetic.*live/iu.test(shellText));
    }
    record(`${route.publicPath}:handler_exists`, fs.existsSync(handler), route.handlerModule);
    if (!fs.existsSync(handler)) continue;
    const text = fs.readFileSync(handler, "utf8");
    const methods = astRow(route.handlerModule).methods;
    record(`${route.publicPath}:methods_preserved`, JSON.stringify(methods) === JSON.stringify([...route.methods].sort()), { expected: route.methods, actual: methods });
    record(`${route.publicPath}:route_config_removed`, !/export\s+const\s+(?:runtime|dynamic|maxDuration|revalidate|preferredRegion|fetchCache|dynamicParams)\s*=/u.test(text));
    record(`${route.publicPath}:registry_loader`, registryText.includes(`import("@/${route.handlerModule.replace(/\.ts$/u, "")}")`));
    record(`${route.publicPath}:handler_hash`, sha256(handler) === route.handlerSha256, { expected: route.handlerSha256, actual: sha256(handler) });
    const handlerBytes = fs.statSync(handler).size;
    record(`${route.publicPath}:handler_bytes`, handlerBytes === route.handlerBytes, {
      expected: route.handlerBytes,
      actual: handlerBytes,
    });
    record(`${route.publicPath}:no_broken_old_relative_lib_import`, !text.includes('"../../../../lib/') && !text.includes("'../../../../lib/"));
  }
}

record("summary:route_count", routeCount === manifest.summary.oldEntrypointsRemoved, { routeCount, expected: manifest.summary.oldEntrypointsRemoved });
record("summary:net_reduction", manifest.summary.netEntrypointReduction === manifest.summary.oldEntrypointsRemoved - manifest.summary.newEntrypointsAdded, manifest.summary);
record("shared_dispatch_helper", fs.existsSync(path.join(root, "lib/server/lazy-route-dispatch.ts")));
record("shared_options_helper", fs.readFileSync(path.join(root, "lib/server/lazy-route-dispatch.ts"), "utf8").includes("export function optionsLazyRoute"));
record("no_undeclared_server_only_import", !fs.readFileSync(path.join(root, "lib/server/lazy-route-dispatch.ts"), "utf8").includes(["server", "only"].join("-")));

const result = {
  schemaVersion: "velmere.pass15.route-dispatch-verification.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static source/contract verification with hash-bound TypeScript AST route export registry. Exact AST reparse, runtime parity and HTTP behavior still require the exact A78R1/A79R1 toolchain, production builds and browser/E2E replay.",
  summary: {
    groups: groups.length,
    routesPreserved: routeCount,
    publicPathsUnique: publicPaths.size,
    checks: checks.length,
    passed: checks.filter((row) => row.ok).length,
    failed: failures.length,
    netNextEntrypointReduction: manifest.summary.netEntrypointReduction,
    routeAstRegistryFiles: routeAstRegistry.fileCount,
    routeAstRegistryExactCredit: routeAstRegistry.exactAstReparseCredit,
  },
  failures,
  checks,
};
const writeEvidence = process.argv.includes("--write-evidence") || process.env.VELMERE_WRITE_EVIDENCE === "1";
const requestedOutput = argumentValue("--output");
const out = requestedOutput
  ? path.resolve(root, requestedOutput)
  : writeEvidence
    ? path.join(root, "config/pass15/route-dispatch-verification.json")
    : path.join(root, ".velmere/pass15-diagnostics/route-dispatch-verification.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result.summary, null, 2));
if (failures.length) process.exit(1);
