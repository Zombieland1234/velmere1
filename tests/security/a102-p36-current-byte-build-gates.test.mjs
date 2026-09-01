#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { expectedBuildOutputContract } from "../../lib/build/build-watchdog-policy.mjs";
import { sourceTreeDigest } from "../../scripts/deployment/common.mjs";
import {
  bindFile,
  buildP36CurrentByteBuildGates,
  computeDeploymentSourceDigest,
  computeP36SourceIdentitySnapshot,
  computePass13SourceDigest,
  integritySha256,
  validateP36CurrentByteBuildGates,
} from "../../scripts/closure/build-p36-current-byte-build-gates.mjs";

const EXPECTED_NODE = "v24.18.0";
const EXPECTED_NPM = "11.16.0";
const TRUSTED_NATIVE_PACKAGES = ["@parcel/watcher", "@swc/core", "esbuild", "sharp", "unrs-resolver"];
const SOURCE_IDENTITY_PATH = "artifacts/closure/p36/source-identity.json";
const BASE_NOW = Date.now() - 10 * 60_000;

let assertions = 0;
let mutations = 0;
function check(value, message) {
  assertions += 1;
  assert.ok(value, message);
}
function throws(callback, pattern, message) {
  assertions += 1;
  assert.throws(callback, pattern, message);
}
function clone(value) {
  return structuredClone(value);
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function write(root, relativePath, value, mode = 0o644) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, { mode });
  return absolutePath;
}
function writeJson(root, relativePath, value) {
  return write(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}
function iso(ms) {
  return new Date(ms).toISOString();
}
function binding(root, relativePath) {
  return bindFile(root, relativePath, "fixture").binding;
}

function sourceIdentity(root) {
  const current = computeP36SourceIdentitySnapshot(root);
  return {
    schemaVersion: "velmere.p36.source-identity.v1",
    state: "CURRENT_SOURCE_ONLY_IN_PROGRESS",
    classification: "CURRENT_SOURCE_INPUT_EXCLUDES_GENERATED_AND_PHYSICAL_EVIDENCE",
    fileCount: current.fileCount,
    payloadBytes: current.payloadBytes,
    pathSetSha256: current.pathSetSha256,
    sourceAggregateSha256: current.sourceAggregateSha256,
    requiredAuthorityBindings: {
      methodologyV14: ["docs/authority/VELMERE_METODOLOGIA_CANONICAL_V14.txt"],
      growthIntelR12: ["docs/authority/VELMERE_GROWTH_INTEL_R12.txt"],
    },
    exclusionPolicy: { allArtifacts: true },
    files: current.files,
    truthBoundary: "Synthetic current-source identity fixture only.",
  };
}

function assertDeploymentDigestOrderingParity() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-build-digest-order-"));
  try {
    write(root, "Z_ROOT.txt", "uppercase root\n");
    write(root, "app/page.ts", "export const lower = true;\n");
    write(root, "a-root.txt", "lowercase root\n");
    const closureDigest = computeDeploymentSourceDigest(root);
    const officialDigest = sourceTreeDigest(root);
    check(
      JSON.stringify(closureDigest) === JSON.stringify(officialDigest),
      "closure deployment digest must match official UTF-16 ordering for mixed-case paths",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function assertPass13DigestOrderingParity() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-pass13-digest-order-"));
  try {
    write(root, ".dockerignore", "dist\n");
    write(root, "_velmere/receipt.txt", "underscore root\n");
    write(root, "app/page.ts", "export const lower = true;\n");
    const commonUrl = pathToFileURL(path.resolve("scripts/pass13/common.mjs")).href;
    const official = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `import { treeDigest } from ${JSON.stringify(commonUrl)}; process.stdout.write(JSON.stringify(treeDigest({sourceOnly:true})));`],
      { cwd: root, encoding: "utf8", timeout: 30_000, shell: false },
    );
    check(official.status === 0 && official.signal === null, "official Pass13 fixture digest must execute");
    const officialDigest = JSON.parse(official.stdout);
    delete officialDigest.rows;
    const closureDigest = computePass13SourceDigest(root);
    check(
      JSON.stringify(closureDigest) === JSON.stringify(officialDigest),
      "closure Pass13 digest must match official locale ordering for punctuation and underscore paths",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createPhysicalBuildOutput(root, mode, buildId) {
  const distDir = `.next-pass25-${mode}`;
  const contract = expectedBuildOutputContract(root, distDir, buildId);
  write(root, path.relative(root, contract.buildIdPath), `${buildId}\n`);
  write(root, path.relative(root, contract.routesManifestPath), "{}\n");
  write(root, path.relative(root, contract.requiredServerManifestPath), "{}\n");
  write(root, path.relative(root, contract.standaloneServerPath), "module.exports = {};\n");
  write(root, path.relative(root, contract.standaloneNextBootstrapPath), "export {};\n");
  write(root, path.relative(root, contract.standaloneStartServerPath), "export {};\n");
  write(root, path.relative(root, contract.standaloneSwcInteropDefaultPath), "export {};\n");
  write(root, path.relative(root, contract.standaloneSwcInteropWildcardPath), "export {};\n");
  write(root, path.relative(root, contract.standaloneBuildIdPath), `${buildId}\n`);
  write(root, path.join(path.relative(root, contract.standaloneStaticPath), "chunk.js"), "export {};\n");
  write(root, path.join(path.relative(root, contract.standalonePublicPath), "asset.txt"), "asset\n");
  return contract;
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-build-gates-"));
  write(root, "app/page.ts", "export const value = 1;\n");
  write(root, "next-env.d.ts", "/// <reference types=\"next\" />\n");
  write(root, "docs/authority/VELMERE_METODOLOGIA_CANONICAL_V14.txt", "V14\n");
  write(root, "docs/authority/VELMERE_GROWTH_INTEL_R12.txt", "R12\n");
  const packageJson = {
    name: "velmere-p36-fixture",
    version: "1.0.0",
    packageManager: "npm@11.16.0",
    engines: { node: "24.18.0", npm: "11.16.0" },
    devEngines: {
      runtime: { name: "node", version: "24.18.0", onFail: "error" },
      packageManager: { name: "npm", version: "11.16.0", onFail: "error" },
    },
    dependencies: { next: "16.2.12" },
    devDependencies: { typescript: "5.9.3", eslint: "10.8.0" },
  };
  const packageLock = {
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    packages: {
      "": {
        name: packageJson.name,
        version: packageJson.version,
        engines: { node: "24.18.0", npm: "11.16.0" },
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
      },
      "node_modules/next": { version: "16.2.12" },
      "node_modules/typescript": { version: "5.9.3" },
      "node_modules/eslint": { version: "10.8.0" },
    },
  };
  writeJson(root, "package.json", packageJson);
  writeJson(root, "package-lock.json", packageLock);
  const npmCliPath = write(root, "node_modules/npm/bin/npm-cli.js", "// exact npm CLI fixture\n");
  const nodePath = process.execPath;

  const identity = sourceIdentity(root);
  const identityPath = writeJson(root, SOURCE_IDENTITY_PATH, identity);
  fs.utimesSync(identityPath, BASE_NOW / 1_000, BASE_NOW / 1_000);
  const sourceBinding = binding(root, SOURCE_IDENTITY_PATH);
  const packageLockBinding = binding(root, "package-lock.json");
  const nodeBinding = bindFile(root, nodePath, "node").binding;
  const npmBinding = bindFile(root, npmCliPath, "npm").binding;
  const runtime = {
    nodeVersion: EXPECTED_NODE,
    npmVersion: EXPECTED_NPM,
    nodeExecutablePath: nodeBinding.path,
    nodeExecutableSha256: nodeBinding.sha256,
    npmCliPath: npmBinding.path,
    npmCliSha256: npmBinding.sha256,
  };
  const pass13 = computePass13SourceDigest(root);
  const deployment = computeDeploymentSourceDigest(root);
  const capturedNpmLs = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: {
      eslint: { version: "10.8.0" },
      next: { version: "16.2.12" },
      typescript: { version: "5.9.3" },
    },
    problems: [],
  };
  const paths = {
    sourceIdentity: SOURCE_IDENTITY_PATH,
    node: nodePath,
    npmCli: path.relative(root, npmCliPath),
    packageJson: "package.json",
    packageLock: "package-lock.json",
    npmCiLog: "artifacts/closure/p36/build-gates/npm-ci.log",
    npmLsReceipt: "artifacts/closure/p36/build-gates/npm-ls.json",
    trustedNativeLog: "artifacts/closure/p36/build-gates/trusted-native.log",
    typeScriptReceipt: "artifacts/pass13/PASS13_PARTITIONED_TYPESCRIPT.json",
    typeScriptLog: "artifacts/closure/p36/build-gates/typecheck.log",
    eslintReceipt: "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json",
    eslintLog: "artifacts/closure/p36/build-gates/lint.log",
    webpackReceipt: "artifacts/closure/p36/build-gates/webpack-receipt.json",
    webpackLog: "artifacts/closure/p36/build-gates/webpack.log",
    webpackPostLockReceipt: "artifacts/closure/p36/build-gates/webpack-post-lock.json",
    turbopackReceipt: "artifacts/closure/p36/build-gates/turbopack-receipt.json",
    turbopackLog: "artifacts/closure/p36/build-gates/turbopack.log",
    turbopackPostLockReceipt: "artifacts/closure/p36/build-gates/turbopack-post-lock.json",
  };
  writeJson(root, paths.npmLsReceipt, capturedNpmLs);

  function gateLog({ gate, startedAtMs, completedAtMs, receiptPath = null, details = {}, body = "" }) {
    const receipt = receiptPath === null ? null : binding(root, receiptPath);
    const context = {
      schemaVersion: "velmere.p36.gate-execution-context.v1",
      gate,
      sourceIdentitySha256: sourceBinding.sha256,
      sourceAggregateSha256: identity.sourceAggregateSha256,
      packageLockSha256: packageLockBinding.sha256,
      runtime,
      command: {
        npmCi: [nodeBinding.path, npmBinding.path, "ci", "--engine-strict=true", "--strict-allow-scripts=true", "--no-audit", "--no-fund", "--progress=false"],
        trustedNative: [nodeBinding.path, npmBinding.path, "run", "install:trusted-native"],
        typecheck: [nodeBinding.path, npmBinding.path, "run", "typecheck"],
        lint: [nodeBinding.path, npmBinding.path, "run", "lint"],
        webpack: [nodeBinding.path, npmBinding.path, "run", "build:webpack"],
        turbopack: [nodeBinding.path, npmBinding.path, "run", "build:turbopack"],
      }[gate],
      startedAt: iso(startedAtMs),
    };
    const result = {
      schemaVersion: "velmere.p36.gate-execution-result.v1",
      gate,
      status: "PASS",
      exitCode: 0,
      signal: null,
      startedAt: iso(startedAtMs),
      completedAt: iso(completedAtMs),
      durationMs: completedAtMs - startedAtMs,
      sourceIdentitySha256: sourceBinding.sha256,
      sourceAggregateSha256: identity.sourceAggregateSha256,
      packageLockSha256: packageLockBinding.sha256,
      receipt,
      details,
    };
    return `P36_GATE_CONTEXT ${JSON.stringify(context)}\n${body}P36_GATE_RESULT ${JSON.stringify(result)}\n`;
  }

  write(root, paths.npmCiLog, gateLog({
    gate: "npmCi",
    startedAtMs: BASE_NOW + 1_000,
    completedAtMs: BASE_NOW + 2_000,
    details: { packagesAdded: 5 },
    body: "added 5 packages in 1s\n",
  }));
  write(root, paths.trustedNativeLog, gateLog({
    gate: "trustedNative",
    startedAtMs: BASE_NOW + 3_000,
    completedAtMs: BASE_NOW + 4_000,
    details: { packages: TRUSTED_NATIVE_PACKAGES.length },
    body: `${JSON.stringify({
      status: "PASS_EXACT_TRUSTED_NATIVE_REBUILD",
      node: "24.18.0",
      npm: EXPECTED_NPM,
      npmCli: npmBinding.path,
      packages: TRUSTED_NATIVE_PACKAGES,
    })}\n`,
  }));

  const typeScriptReceipt = {
    schemaVersion: "velmere.pass13.partitioned-typescript.v1",
    generatedAt: iso(BASE_NOW + 5_900),
    ok: true,
    typescriptVersion: "5.9.3",
    partitionCount: 1,
    partitions: [{
      idx: 0,
      roots: ["app/page.ts"],
      files: ["app/page.ts"],
      diagnostics: [],
      durationMs: 10,
      typescript: "5.9.3",
      exitCode: 0,
      signal: null,
      timedOut: false,
    }],
    configuredRootFiles: 1,
    rootFilesCovered: 1,
    transitiveFirstPartyFiles: 1,
    toolingSyntaxFiles: 1,
    toolingSyntaxErrors: [],
    sourceBefore: pass13.sha256,
    sourceAfter: pass13.sha256,
    sourceImmutable: true,
    nextEnvBeforeSha256: "1".repeat(64),
    nextEnvAfterSha256: "1".repeat(64),
    nextEnvImmutable: true,
  };
  writeJson(root, paths.typeScriptReceipt, typeScriptReceipt);
  write(root, paths.typeScriptLog, gateLog({
    gate: "typecheck",
    startedAtMs: BASE_NOW + 5_000,
    completedAtMs: BASE_NOW + 6_000,
    receiptPath: paths.typeScriptReceipt,
    body: "PASS13 TypeScript: 1/1 partitions · roots 1/1 · transitive 1 · tooling 1 · diagnostics 0\n",
  }));

  const eslintCliSha = "2".repeat(64);
  const eslintReceipt = {
    schemaVersion: "velmere.pass13.partitioned-eslint.v4",
    generatedAt: iso(BASE_NOW + 7_900),
    ok: true,
    requestedPartitionStart: 1,
    requestedPartitionEnd: 1,
    fileCount: 1,
    partitionCount: 1,
    completedPartitions: 1,
    passedPartitions: 1,
    filesCovered: 1,
    lintErrors: 0,
    lintWarnings: 0,
    processFailureCount: 0,
    firstProcessFailure: null,
    messages: [],
    processFailures: [],
    parts: [{
      index: 1,
      expectedFiles: ["app/page.ts"],
      fileCount: 1,
      resultFileCount: 1,
      resultPathSetMatch: true,
      plannedInvocations: 1,
      completedInvocations: 1,
      lintErrors: 0,
      lintWarnings: 0,
      generatedIgnored: 0,
      processFailure: null,
      invocations: [{
        index: 1,
        fileCount: 1,
        sourceBytes: 24,
        resultFileCount: 1,
        resultPathSetMatch: true,
        exitCode: 0,
        signal: null,
        timedOut: false,
        lintErrors: 0,
        lintWarnings: 0,
        generatedIgnored: 0,
        processFailure: null,
        stderrTail: "",
      }],
      durationMs: 10,
      passed: true,
    }],
    invocationPolicy: {},
    eslintIdentity: { packageVersion: "10.8.0", cliSha256: eslintCliSha },
    nodeExecutable: nodePath,
    sourceBefore: pass13.sha256,
    sourceAfter: pass13.sha256,
    sourceImmutable: true,
  };
  writeJson(root, paths.eslintReceipt, eslintReceipt);
  write(root, paths.eslintLog, gateLog({
    gate: "lint",
    startedAtMs: BASE_NOW + 7_000,
    completedAtMs: BASE_NOW + 8_000,
    receiptPath: paths.eslintReceipt,
    body: "PASS13 ESLint shard: 1/1 passed · 1 files · 0 errors · 0 warnings · 0 process failures\n",
  }));

  function buildReceipt(mode, startedAtMs, completedAtMs) {
    const distDir = `.next-pass25-${mode}`;
    const buildId = `vlm-deployment-${mode}-${deployment.sha256.slice(0, 16)}`;
    createPhysicalBuildOutput(root, mode, buildId);
    const compileLogPath = `artifacts/closure/p36/build-gates/${mode}-compile.log`;
    const generateLogPath = `artifacts/closure/p36/build-gates/${mode}-generate.log`;
    write(root, compileLogPath, `${mode} compile PASS\n`);
    write(root, generateLogPath, `${mode} generate PASS\n`);
    const compileBinding = binding(root, compileLogPath);
    const generateBinding = binding(root, generateLogPath);
    const receiptPath = paths[`${mode}Receipt`];
    const postLockPath = paths[`${mode}PostLockReceipt`];
    const receipt = {
      schemaVersion: "velmere.segmented-build.v1",
      generatedAt: iso(completedAtMs - 300),
      mode,
      status: "PASS",
      ok: true,
      node: EXPECTED_NODE,
      npm: EXPECTED_NPM,
      profile: { name: "conservative" },
      buildId,
      distDir,
      sourceAtInvocation: deployment,
      sourceBefore: deployment,
      sourceAfter: deployment,
      sourceStableAtLock: true,
      sourceImmutable: true,
      buildLock: {
        acquisition: { acquired: true, status: "ACQUIRED" },
        release: { released: true, status: "RELEASED", absentAtRelease: true },
      },
      compile: {
        phase: "compile", status: "PASS", ok: true, startedAt: iso(startedAtMs), completedAt: iso(startedAtMs + 250), durationMs: 250,
        exitCode: 0, signal: null, timedOut: false, stalled: false, memoryBudgetExceeded: false, spawnError: null,
        log: compileLogPath, logSha256: compileBinding.sha256,
      },
      compatibility: { status: mode === "webpack" ? "STAGED" : "NOT_REQUIRED" },
      generate: {
        phase: "generate", status: "PASS", ok: true, startedAt: iso(startedAtMs + 300), completedAt: iso(startedAtMs + 550), durationMs: 250,
        exitCode: 0, signal: null, timedOut: false, stalled: false, memoryBudgetExceeded: false, spawnError: null,
        log: generateLogPath, logSha256: generateBinding.sha256,
      },
      runtimeClosure: { status: "PASS" },
      buildIdCheckpoints: { afterCompile: { ok: true }, beforeGenerate: { ok: true }, final: { ok: true } },
      managedNextEnv: { observed: { exactExpectedContent: true }, restored: { restored: true } },
      outputContract: { ok: true, checks: [{ label: "fixture", ok: true }] },
      fatal: null,
      truthBoundary: "Synthetic build receipt fixture only.",
    };
    writeJson(root, receiptPath, receipt);
    const postLock = {
      schemaVersion: "velmere.segmented-build-lock-post-process-verifier.v1",
      generatedAt: iso(completedAtMs - 100),
      startedAt: iso(completedAtMs - 200),
      phase: "post-build",
      status: "PASS",
      ok: true,
      settleMs: 2_000,
      intervalMs: 100,
      checks: 21,
      namespaceSha256: "3".repeat(64),
      rawExternalPathDisclosed: false,
      firstFailure: null,
      finalInspection: { ok: true },
      truthBoundary: "Synthetic post-lock fixture only.",
    };
    writeJson(root, postLockPath, postLock);
    write(root, paths[`${mode}Log`], gateLog({
      gate: mode,
      startedAtMs,
      completedAtMs,
      receiptPath,
      body: `${mode} production build PASS\n`,
    }));
  }
  buildReceipt("webpack", BASE_NOW + 9_000, BASE_NOW + 10_000);
  buildReceipt("turbopack", BASE_NOW + 11_000, BASE_NOW + 12_000);

  // File mtimes are real wall-clock values even though the receipt chronology is
  // intentionally backdated. Capture the validation clock only after every
  // fixture input has been written so the future-mtime guard remains meaningful.
  const nowMs = Date.now();
  const runtimeProbe = () => ({
    node: { status: 0, signal: null, stdout: `${EXPECTED_NODE}\n`, stderr: "", error: null },
    npm: { status: 0, signal: null, stdout: `${EXPECTED_NPM}\n`, stderr: "", error: null },
  });
  const npmLsProbe = () => ({ status: 0, signal: null, stdout: JSON.stringify(capturedNpmLs), stderr: "", error: null });
  const build = () => buildP36CurrentByteBuildGates({ root, paths, nowMs, runtimeProbe, npmLsProbe });
  return { root, paths, build, nowMs, gateLog, capturedNpmLs };
}

assertDeploymentDigestOrderingParity();
assertPass13DigestOrderingParity();
const fixture = createFixture();
const first = fixture.build();
const second = fixture.build();
check(JSON.stringify(first) === JSON.stringify(second), "same current bytes and receipts must build deterministically");
check(validateP36CurrentByteBuildGates(first).ok, "generated current-byte build-gate receipt must validate");
check(first.schemaVersion === "velmere.p36.current-byte-build-gates.v1", "schema must be exact v1");
check(first.summary.pass === true && first.summary.passedRequiredGates === 6 && first.summary.requiredGateDenominator === 6, "all six required gates must pass");
check(first.gates.exactWindows === false, "exact Windows must remain explicitly false");
check(Object.entries(first.gates).filter(([name]) => name !== "exactWindows").every(([, value]) => value === true), "all current Linux internal gates must be true");
check(first.runtime.nodeVersion === EXPECTED_NODE && first.runtime.npmVersion === EXPECTED_NPM, "runtime versions must be exact");
check(first.runtime.nodeExecutable.sha256 === sha256(fs.readFileSync(process.execPath)), "runtime executable bytes must be bound");
check(first.runtime.packageLock.sha256 === binding(fixture.root, "package-lock.json").sha256, "package lock bytes must be bound");
check(first.denominators.dependencyInstall.packagesAdded === 5, "npm ci package denominator must be retained");
check(first.denominators.dependencyTree.problems === 0 && first.denominators.dependencyTree.topLevelDependencies === 3, "npm ls must be clean and counted");
check(first.denominators.trustedNative.packageCount === 5, "trusted native denominator must be exact");
check(first.denominators.typeScript.partitions === 1 && first.denominators.typeScript.diagnostics === 0, "full TypeScript denominator must be clean");
check(first.denominators.eslint.partitions === 1 && first.denominators.eslint.errors === 0 && first.denominators.eslint.warnings === 0, "full ESLint denominator must be zero-warning");
check(first.buildOutputs.webpack.buildId.startsWith("vlm-deployment-webpack-"), "Webpack physical build ID must be retained");
check(first.buildOutputs.turbopack.buildId.startsWith("vlm-deployment-turbopack-"), "Turbopack physical build ID must be retained");
check(first.inputs.webpackPhaseLogs.compile.sha256 === binding(fixture.root, "artifacts/closure/p36/build-gates/webpack-compile.log").sha256, "phase logs must be byte-bound");
check(first.creditBoundary.exactWindows === false && first.creditBoundary.staging === false && first.creditBoundary.paidRelease === false && first.creditBoundary.live === false, "no Windows/staging/paid/LIVE promotion is allowed");
check(first.integritySha256 === integritySha256(first), "self integrity must cover the canonical unsigned payload");

const receiptMutations = [
  ["schema", (value) => { value.schemaVersion = "velmere.p36.current-byte-build-gates.v2"; }],
  ["integrity", (value) => { value.integritySha256 = "0".repeat(64); }, false],
  ["node gate", (value) => { value.gates.exactNodeNpm = false; }],
  ["dependency gate", (value) => { value.gates.cleanDependencyClosure = false; }],
  ["typecheck gate", (value) => { value.gates.fullTypecheck = false; }],
  ["lint gate", (value) => { value.gates.fullLint = false; }],
  ["webpack gate", (value) => { value.gates.webpackProductionBuild = false; }],
  ["turbopack gate", (value) => { value.gates.turbopackProductionBuild = false; }],
  ["Windows promotion", (value) => { value.gates.exactWindows = true; }],
  ["summary", (value) => { value.summary.pass = false; }],
  ["npm ls", (value) => { value.denominators.dependencyTree.problems = 1; }],
  ["TypeScript diagnostic", (value) => { value.denominators.typeScript.diagnostics = 1; }],
  ["ESLint warning", (value) => { value.denominators.eslint.warnings = 1; }],
  ["Webpack build ID", (value) => { value.buildOutputs.webpack.buildId = "forged"; }],
  ["paid promotion", (value) => { value.creditBoundary.paidRelease = true; }],
];
for (const [label, mutate, resign = true] of receiptMutations) {
  const mutated = clone(first);
  mutate(mutated);
  if (resign) mutated.integritySha256 = integritySha256(mutated);
  const validated = validateP36CurrentByteBuildGates(mutated);
  mutations += 1;
  check(!validated.ok, `validator must reject mutation: ${label}`);
}

const sourceMismatch = createFixture();
write(sourceMismatch.root, "app/page.ts", "export const value = 2;\n");
throws(sourceMismatch.build, /source_identity_(?:payload|aggregate|rows)/u, "builder must reject source changed after identity");

const staleInput = createFixture();
const staleLog = path.join(staleInput.root, staleInput.paths.npmCiLog);
fs.utimesSync(staleLog, (BASE_NOW - 60_000) / 1_000, (BASE_NOW - 60_000) / 1_000);
throws(staleInput.build, /npmCiLog_predates_source_identity|npmCi_log_predates_source_identity/u, "builder must reject stale pre-identity npm ci log");

const npmProblems = createFixture();
const captured = JSON.parse(fs.readFileSync(path.join(npmProblems.root, npmProblems.paths.npmLsReceipt), "utf8"));
captured.problems = ["missing: next"];
writeJson(npmProblems.root, npmProblems.paths.npmLsReceipt, captured);
throws(npmProblems.build, /npm_ls_captured_problems/u, "builder must reject npm ls problems");

const eslintWarning = createFixture();
const eslintPath = path.join(eslintWarning.root, eslintWarning.paths.eslintReceipt);
const eslintReceipt = JSON.parse(fs.readFileSync(eslintPath, "utf8"));
eslintReceipt.lintWarnings = 1;
writeJson(eslintWarning.root, eslintWarning.paths.eslintReceipt, eslintReceipt);
throws(eslintWarning.build, /lint_receipt_binding_(?:bytes|sha256)|eslint_findings/u, "builder must reject an incomplete or re-bound warning receipt");

const buildFailure = createFixture();
const webpackPath = path.join(buildFailure.root, buildFailure.paths.webpackReceipt);
const webpackReceipt = JSON.parse(fs.readFileSync(webpackPath, "utf8"));
webpackReceipt.ok = false;
webpackReceipt.status = "FAIL";
writeJson(buildFailure.root, buildFailure.paths.webpackReceipt, webpackReceipt);
throws(buildFailure.build, /webpack_receipt_binding_(?:bytes|sha256)|webpack_status/u, "builder must reject a failed or re-bound production build receipt");

console.log(
  `P36 current-byte build gates: PASS (${assertions}/${assertions}); receipt mutations ${mutations}/${mutations}; fail-closed source/stale/npm/lint/build cases 5/5`,
);
