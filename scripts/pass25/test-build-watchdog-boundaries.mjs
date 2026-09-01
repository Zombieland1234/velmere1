#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import {
  assertSafeBuildOutput,
  classifyBuildResult,
  expectedBuildOutputContract,
} from "../../lib/build/build-watchdog-policy.mjs";

let assertions = 0;
function equal(actual, expected, message) { assert.equal(actual, expected, message); assertions += 1; }
function throws(fn, pattern, message) { assert.throws(fn, pattern, message); assertions += 1; }

const base = { exitCode: 1, signal: null, sourceImmutable: true, outputContractOk: false };
equal(classifyBuildResult({ ...base, sourceImmutable: false }), "FAIL_SOURCE_MUTATION", "source mutation has highest priority");
equal(classifyBuildResult({ ...base, spawnError: "spawn failed" }), "FAIL_SPAWN", "spawn failure");
equal(classifyBuildResult({ ...base, logText: "FATAL ERROR: Allocation failed - JavaScript heap out of memory" }), "FAIL_OOM", "OOM classification");
equal(classifyBuildResult({ ...base, logText: "ENOSPC: no space left on device" }), "FAIL_DISK", "disk classification");
equal(classifyBuildResult({ ...base, logText: "ReferenceError: Cannot access 'x' before initialization" }), "FAIL_CONFIG", "config TDZ classification");
equal(classifyBuildResult({ ...base, logText: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package next-intl" }), "FAIL_DEPENDENCY", "dependency classification");
equal(classifyBuildResult({ ...base, logText: "Type error: Type 'x' is not assignable" }), "FAIL_TYPECHECK", "typecheck classification");
equal(classifyBuildResult({ ...base, stalled: true }), "FAIL_STALL", "stall classification");
equal(classifyBuildResult({ ...base, timedOut: true }), "FAIL_TIMEOUT", "timeout classification");
equal(classifyBuildResult({ ...base, logText: "Failed to compile" }), "FAIL_COMPILE", "compile classification");
equal(classifyBuildResult({ ...base }), "FAIL", "generic non-zero failure");
equal(classifyBuildResult({ exitCode: 0, signal: null, sourceImmutable: true, outputContractOk: false }), "FAIL_OUTPUT_CONTRACT", "missing build output rejected");
equal(classifyBuildResult({ exitCode: 0, signal: null, sourceImmutable: true, outputContractOk: true }), "PASS", "successful build contract");

const root = process.cwd();
const webpack = assertSafeBuildOutput(root, ".next-pass25-webpack");
equal(webpack.relative, ".next-pass25-webpack", "webpack output accepted");
const turbo = expectedBuildOutputContract(root, ".next-pass25-turbopack", "vlm-pass25-turbo-test");
equal(turbo.relative, ".next-pass25-turbopack", "turbopack output accepted");
equal(path.basename(turbo.buildIdPath), "BUILD_ID", "BUILD_ID contract path");
throws(() => assertSafeBuildOutput(root, ".next"), /PASS25 build configuration rejected|unsafe PASS25/u, "generic .next rejected");
throws(() => assertSafeBuildOutput(root, "../outside"), /PASS25 build configuration rejected|unsafe PASS25/u, "outside path rejected");

console.log(JSON.stringify({
  schemaVersion: "velmere.pass25.build-watchdog-boundaries.v1",
  status: "PASS",
  assertions,
  truthBoundary: "Failure classification and safe-output boundary tests only. No production build was executed."
}, null, 2));
