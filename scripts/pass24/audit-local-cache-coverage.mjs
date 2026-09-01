#!/usr/bin/env node
import path from "node:path";
import { DIAGNOSTICS_DIR, readJson, REQUIREMENTS_PATH, resolveCacheRoot, verifyCacheCoverage, writeJson } from "./runtime-lib.mjs";

const cacheIndex = process.argv.findIndex((value) => value === "--cache" || value === "--cache-root");
const explicitCache = cacheIndex >= 0 ? process.argv[cacheIndex + 1] : null;
if (cacheIndex >= 0 && !explicitCache) throw new Error("PASS24 cache audit requires a value after --cache/--cache-root");
const resolvedCache = resolveCacheRoot(explicitCache);
const cacheRoot = resolvedCache.cacheRoot;
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : path.join(DIAGNOSTICS_DIR, "cache-coverage.json");
const requirements = readJson(REQUIREMENTS_PATH);
const report = verifyCacheCoverage(cacheRoot, requirements);
report.cacheRootSource = resolvedCache.source;
report.status = report.ok ? "PASS_EXACT_CACHE" : "BLOCKED_INCOMPLETE_CACHE";
report.truthBoundary = "Incomplete cache is an infrastructure blocker and must never be promoted to milestone PASS.";
writeJson(output, report);
console.log(`PASS24 cache: ${report.passed}/${report.required} (${report.coveragePercent}%) status=${report.status}`);
console.log(`PASS24 cache root: ${report.cacheRoot} source=${report.cacheRootSource}`);
console.log(`PASS24 cache report: ${path.relative(process.cwd(), output)}`);
