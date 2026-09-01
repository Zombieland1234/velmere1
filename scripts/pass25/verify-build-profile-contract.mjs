#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BUILD_PROFILE_DEFAULTS,
  resolveBuildProfile,
  resolveBuildSettings,
  safeBuildOutputPath,
  validateBuildId,
  validateCheckpointSha,
  validateRuntimeDistDir,
} from "../../lib/build/build-profile.mjs";

const root = process.cwd();
let assertions = 0;
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); assertions += 1; }
function ok(value, message) { assert.ok(value, message); assertions += 1; }
function throws(fn, pattern, message) { assert.throws(fn, pattern, message); assertions += 1; }

const balanced = resolveBuildProfile({});
equal(balanced.name, "balanced", "balanced is the default profile");
equal(balanced.cpus, 2, "balanced CPU default");
equal(balanced.webpackBuildWorker, false, "balanced uses in-process webpack");
equal(balanced.webpackMemoryOptimizations, true, "balanced enables memory optimizations");
equal(balanced.parallelServerCompiles, false, "balanced does not request incompatible parallel compiles");

const conservative = resolveBuildProfile({ VELMERE_BUILD_PROFILE: "conservative" });
equal(conservative.cpus, 1, "conservative CPU count");
equal(conservative.webpackMemoryOptimizations, true, "conservative memory optimization");
equal(conservative.webpackBuildWorker, false, "conservative worker policy");
equal(conservative.turbopackMemoryLimit, 1363148800, "conservative Turbopack native memory cap");

const throughput = resolveBuildProfile({ VELMERE_BUILD_PROFILE: "throughput" });
equal(throughput.cpus, 4, "throughput CPU count");
equal(throughput.webpackBuildWorker, true, "throughput enables webpack worker");
equal(throughput.parallelServerCompiles, true, "throughput parallel compiles");
equal(throughput.parallelServerBuildTraces, true, "throughput parallel traces");

equal(resolveBuildProfile({ VELMERE_BUILD_CPUS: "3" }).cpus, 3, "explicit CPU override");
throws(() => resolveBuildProfile({ VELMERE_BUILD_PROFILE: "fastest" }), /unsupported VELMERE_BUILD_PROFILE/u, "unknown profile fails closed");
throws(() => resolveBuildProfile({ VELMERE_BUILD_CPUS: "0" }), /integer from 1 to 4/u, "zero CPUs rejected");
throws(() => resolveBuildProfile({ VELMERE_BUILD_CPUS: "5" }), /integer from 1 to 4/u, "excess CPUs rejected");
throws(() => resolveBuildProfile({ VELMERE_BUILD_CPUS: "2.5" }), /integer from 1 to 4/u, "fractional CPUs rejected");

const webpackSettings = resolveBuildSettings({
  VELMERE_RUNTIME_BUILD_SCOPE: "webpack",
  VELMERE_RUNTIME_DIST_DIR: ".next-pass25-webpack",
  VELMERE_RUNTIME_BUILD_ID: "vlm-pass25-webpack-deadbeef",
  VELMERE_BUILD_PROFILE: "balanced",
});
equal(webpackSettings.runtimeBuildScope, "webpack", "webpack scope");
equal(webpackSettings.runtimeDistDir, ".next-pass25-webpack", "webpack distDir");
equal(webpackSettings.runtimeBuildId, "vlm-pass25-webpack-deadbeef", "explicit build ID");
equal(webpackSettings.outputStandalone, true, "scoped build produces standalone output");
const compileSettings = resolveBuildSettings({ VELMERE_RUNTIME_BUILD_SCOPE: "webpack", VELMERE_RUNTIME_OUTPUT_STANDALONE: "false" });
equal(compileSettings.outputStandalone, false, "compile phase can disable standalone output");
throws(() => resolveBuildSettings({ VELMERE_RUNTIME_BUILD_SCOPE: "webpack", VELMERE_RUNTIME_OUTPUT_STANDALONE: "maybe" }), /must be true\/false/u, "invalid standalone boolean rejected");
throws(() => resolveBuildSettings({ VELMERE_RUNTIME_BUILD_SCOPE: "turbopack", VELMERE_TURBOPACK_MEMORY_LIMIT_BYTES: "1" }), /between 268435456/u, "unsafe low Turbopack memory cap rejected");
equal(resolveBuildSettings({ VELMERE_RUNTIME_BUILD_SCOPE: "turbopack", VELMERE_TURBOPACK_MEMORY_LIMIT_BYTES: "1500000000" }).turbopackMemoryLimit, 1500000000, "explicit Turbopack memory cap accepted");

const turboSettings = resolveBuildSettings({
  VELMERE_RUNTIME_BUILD_SCOPE: "turbopack",
  VELMERE_CHECKPOINT_SOURCE_SHA256: "a".repeat(64),
});
equal(turboSettings.runtimeDistDir, ".next-pass25-turbopack", "turbopack default distDir");
equal(turboSettings.runtimeBuildId, `vlm-${"a".repeat(20)}`, "source-bound build ID");

throws(() => validateRuntimeDistDir("../outside", "webpack"), /unsafe path traversal|must equal/u, "path traversal rejected");
throws(() => validateRuntimeDistDir("/tmp/output", "webpack"), /portable relative path/u, "absolute path rejected");
throws(() => validateRuntimeDistDir(".next-pass25-turbopack", "webpack"), /must equal/u, "scope mismatch rejected");
throws(() => resolveBuildSettings({ VELMERE_RUNTIME_DIST_DIR: ".next-pass25-webpack" }), /requires VELMERE_RUNTIME_BUILD_SCOPE/u, "distDir without scope rejected");
throws(() => resolveBuildSettings({ VELMERE_RUNTIME_BUILD_ID: "id-without-scope" }), /requires VELMERE_RUNTIME_BUILD_SCOPE/u, "build ID without scope rejected");
throws(() => validateBuildId("../unsafe"), /safe ASCII token/u, "unsafe build ID rejected");
throws(() => validateCheckpointSha("abc"), /64 lowercase hexadecimal/u, "short checkpoint SHA rejected");
equal(validateCheckpointSha("B".repeat(64)), "b".repeat(64), "uppercase SHA normalized");

equal(path.basename(safeBuildOutputPath(root, ".next-pass25-webpack")), ".next-pass25-webpack", "safe webpack output path");
equal(path.basename(safeBuildOutputPath(root, ".next-pass25-turbopack")), ".next-pass25-turbopack", "safe turbopack output path");
throws(() => safeBuildOutputPath(root, ".next"), /requires VELMERE_RUNTIME_BUILD_SCOPE|must equal|build output/u, "generic .next deletion rejected");

for (const [name, profile] of Object.entries(BUILD_PROFILE_DEFAULTS)) {
  ok(Number.isInteger(profile.cpus) && profile.cpus >= 1 && profile.cpus <= 4, `${name} has bounded CPU count`);
  ok(profile.webpackBuildWorker || (!profile.parallelServerCompiles && !profile.parallelServerBuildTraces), `${name} has compatible worker flags`);
}

const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
ok(nextConfig.includes('from "./lib/build/build-profile.mjs"'), "next config uses the pure build profile module");
ok(!nextConfig.includes("selectedBuildProfile"), "TDZ-prone selectedBuildProfile expression removed");
ok(nextConfig.includes("parallelServerBuildTraces: profile.parallelServerBuildTraces"), "trace policy is profile-bound");
ok(nextConfig.includes("turbopackMemoryLimit: runtimeBuildScope === \"turbopack\""), "Turbopack native memory cap is scope-bound");
ok(nextConfig.includes('runtimeBuildScope === "webpack" && !webpackPersistentCacheEnabled'), "controlled Webpack builds disable persistent cache by default");
ok(nextConfig.includes("config.cache = false"), "Webpack cache suppression is explicit and scope-bound");
ok(!/VELMERE_RUNTIME_DIST_DIR[^\n]*path\./u.test(nextConfig), "next config does not directly manipulate an untrusted distDir");

console.log(JSON.stringify({
  schemaVersion: "velmere.pass25.build-profile-contract.v1",
  status: "PASS",
  assertions,
  profiles: Object.keys(BUILD_PROFILE_DEFAULTS),
  truthBoundary: "Pure build-profile and path-safety contract. A successful Next build remains a separate gate."
}, null, 2));
