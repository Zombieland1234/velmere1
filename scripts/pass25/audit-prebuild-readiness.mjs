#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DIAGNOSTICS_DIR, readJson, relativeToRoot, sourceTreeDigest, writeJson } from "./common.mjs";
import { BUILD_PROFILE_DEFAULTS } from "../../lib/build/build-profile.mjs";

const root = process.cwd();
const budget = readJson(path.join(root, "config", "pass25", "prebuild-budget.json"));
const errors = [];
const warnings = [];
const checks = [];
function check(label, condition, details = null) {
  checks.push({ label, ok: Boolean(condition), details });
  if (!condition) errors.push({ label, details });
}
function warn(label, condition, details = null) {
  if (!condition) warnings.push({ label, details });
}
function runNodeCheck(relative) {
  const result = spawnSync(process.execPath, ["--check", relative], { cwd: root, encoding: "utf8", timeout: 30000 });
  check(`node-check:${relative}`, result.status === 0, (result.stderr || result.stdout || "").trim() || null);
}

const sourceBefore = sourceTreeDigest(root);
const graphResult = spawnSync(process.execPath, ["scripts/pass14/profile-build-graph.mjs"], {
  cwd: root, encoding: "utf8", timeout: 180000, maxBuffer: 64 * 1024 * 1024,
});
check("build-graph-profiler-exit", graphResult.status === 0, (graphResult.stderr || "").trim() || null);
const graphPath = path.join(root, ".velmere", "pass14-diagnostics", "build-graph-profile.json");
check("build-graph-report-present", fs.existsSync(graphPath), relativeToRoot(graphPath));
const graph = fs.existsSync(graphPath) ? readJson(graphPath) : { summary: {}, topEntrypointsByTransitiveBytes: [], cssPressure: [] };
const maximums = budget.maximums;
check("entrypoint-budget", graph.summary.entrypoints <= maximums.entrypoints, { actual: graph.summary.entrypoints, maximum: maximums.entrypoints });
check("api-route-budget", graph.summary.apiRoutes <= maximums.apiRoutes, { actual: graph.summary.apiRoutes, maximum: maximums.apiRoutes });
check("client-boundary-budget", graph.summary.serverRoutesImportingClientCode <= maximums.serverRoutesImportingClientCode, { actual: graph.summary.serverRoutesImportingClientCode, maximum: maximums.serverRoutesImportingClientCode });
check("unresolved-import-budget", graph.summary.unresolvedLocalImports <= maximums.unresolvedLocalImports, { actual: graph.summary.unresolvedLocalImports, maximum: maximums.unresolvedLocalImports });
const topEntrypoint = graph.topEntrypointsByTransitiveBytes?.[0] ?? null;
check("largest-entrypoint-budget", (topEntrypoint?.transitiveBytes ?? 0) <= maximums.topEntrypointTransitiveBytes, { actual: topEntrypoint?.transitiveBytes ?? 0, maximum: maximums.topEntrypointTransitiveBytes, entry: topEntrypoint?.entry ?? null });
check("aggregate-css-budget", graph.summary.cssBytes <= maximums.cssBytes, { actual: graph.summary.cssBytes, maximum: maximums.cssBytes });
const globals = graph.cssPressure?.find((row) => row.file === "app/globals.css") ?? null;
check("globals-css-budget", (globals?.bytes ?? 0) <= maximums.globalsCssBytes, { actual: globals?.bytes ?? 0, maximum: maximums.globalsCssBytes });

const packageJson = readJson(path.join(root, "package.json"));
const lockfile = readJson(path.join(root, "package-lock.json"));
check("next-version-exact", packageJson.dependencies?.next === budget.nextVersion, { package: packageJson.dependencies?.next, expected: budget.nextVersion });
check("lockfile-next-version", lockfile.packages?.["node_modules/next"]?.version === budget.nextVersion, { lockfile: lockfile.packages?.["node_modules/next"]?.version, expected: budget.nextVersion });
check("node-engine-exact", packageJson.engines?.node === "24.18.0", packageJson.engines);
check("npm-engine-exact", packageJson.engines?.npm === "11.16.0", packageJson.engines);
check("node-version-file", fs.readFileSync(path.join(root, ".node-version"), "utf8").trim() === "24.18.0");
check("nvmrc-file", fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim() === "24.18.0");

const tsconfig = readJson(path.join(root, "tsconfig.json"));
for (const glob of budget.requiredTypeGlobs) check(`tsconfig-type-glob:${glob}`, tsconfig.include?.includes(glob), tsconfig.include ?? null);
const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
check("tdz-prone-selected-profile-removed", !nextConfig.includes("selectedBuildProfile"));
check("pure-profile-module-used", nextConfig.includes('from "./lib/build/build-profile.mjs"'));
check("profile-bound-worker-setting", nextConfig.includes("webpackBuildWorker: profile.webpackBuildWorker"));
check("profile-bound-parallel-compiles", nextConfig.includes("parallelServerCompiles: profile.parallelServerCompiles"));
check("profile-bound-parallel-traces", nextConfig.includes("parallelServerBuildTraces: profile.parallelServerBuildTraces"));
check("source-maps-disabled", nextConfig.includes("productionBrowserSourceMaps: false") && nextConfig.includes("serverSourceMaps: false"));
for (const [name, profile] of Object.entries(BUILD_PROFILE_DEFAULTS)) {
  check(`worker-profile-compatible:${name}`, profile.webpackBuildWorker || (!profile.parallelServerCompiles && !profile.parallelServerBuildTraces), profile);
}

for (const relative of [
  "next.config.mjs",
  "lib/build/build-profile.mjs",
  "lib/build/build-watchdog-policy.mjs",
  "scripts/pass25/common.mjs",
  "scripts/pass25/run-build-watchdog.mjs",
  "scripts/pass25/verify-build-profile-contract.mjs",
  "scripts/pass25/test-build-watchdog-boundaries.mjs",
]) runNodeCheck(relative);

for (const relative of [".next-pass25-webpack", ".next-pass25-turbopack"]) {
  check(`no-stale-build-output:${relative}`, !fs.existsSync(path.join(root, relative)), fs.existsSync(path.join(root, relative)) ? "present" : "absent");
}

const tsconfigFiles = fs.readdirSync(root).filter((name) => /^tsconfig.*\.json$/u.test(name));
warn("tsconfig-debt", tsconfigFiles.length <= 20, { count: tsconfigFiles.length, advisory: "Historical targeted tsconfig files should be archived after runtime proof, not before." });
warn("globals-css-maintainability", (globals?.lines ?? 0) <= 20000, { lines: globals?.lines ?? 0, advisory: "Visual freeze prevents blind refactor; split only with screenshot parity." });

const sourceAfter = sourceTreeDigest(root);
const sourceImmutable = sourceBefore.sha256 === sourceAfter.sha256;
check("source-immutable", sourceImmutable, { before: sourceBefore.sha256, after: sourceAfter.sha256 });
const result = {
  schemaVersion: "velmere.pass25.prebuild-readiness.v1",
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  status: errors.length === 0 ? "PASS_STATIC_PREBUILD_READY_RUNTIME_BLOCKED" : "FAIL_STATIC_PREBUILD",
  sourceBefore,
  sourceAfter,
  sourceImmutable,
  graph: {
    summary: graph.summary,
    topEntrypoint,
    globalsCss: globals,
    diagnostics: relativeToRoot(graphPath),
  },
  checks,
  errors,
  warnings,
  truthBoundary: "Static prebuild/configuration/graph readiness only. Semantic TypeScript, ESLint, npm tests and both production builds require exact Node 24.18.0/npm 11.16.0 plus a complete lockfile cache.",
};
writeJson(path.join(DIAGNOSTICS_DIR, "prebuild-readiness.json"), result);
console.log(JSON.stringify({ status: result.status, checks: checks.length, errors: errors.length, warnings: warnings.length, graph: result.graph.summary, topEntrypoint, sourceImmutable }, null, 2));
if (!result.ok) process.exit(1);
