#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { evaluateA62Inputs, inspectBrowserBundle, inspectDependencyBundle, inspectRuntimeArchive } from "./pass36/a62-offline-runtime-dependency-lib.mjs";
import { buildIsolatedExecutionEnvironment, snapshotTree } from "./pass36/a78-exact-runtime-bootstrap-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./pass36/current-source-authority-lib.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json"), "utf8"));
const artifactRoot = path.join(root, "artifacts/pass36/a62");
const logRoot = path.join(artifactRoot, "logs");
fs.mkdirSync(logRoot, { recursive: true });
const stages = [];
let mutationStarted = false;
let failure = null;

function sourceState() {
  return validateCurrentSourceAuthorityExact(root);
}
function run(id, command, args, env, timeout = 45 * 60_000) {
  const started = Date.now();
  if (!env || typeof env !== "object") throw new Error(`a62_isolated_environment_required:${id}`);
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024, timeout, env });
  fs.writeFileSync(path.join(logRoot, `${id}.stdout.log`), result.stdout ?? "");
  fs.writeFileSync(path.join(logRoot, `${id}.stderr.log`), result.stderr ?? "");
  const row = { id, command: [command, ...args], exitCode: result.status, signal: result.signal, error: result.error?.message ?? null, durationMs: Date.now() - started, ok: result.status === 0 };
  stages.push(row);
  if (!row.ok) throw new Error(`a62_stage_failed:${id}`);
  return row;
}
const nodeArchive = String(process.env.VELMERE_A62_NODE_ARCHIVE ?? "").trim();
const dependencyBundle = String(process.env.VELMERE_A62_DEPENDENCY_BUNDLE ?? "").trim();
const browserBundle = String(process.env.VELMERE_A62_BROWSER_BUNDLE ?? "").trim();
const expectedBrowserBundleSha256 = String(process.env.VELMERE_A62_EXPECTED_BROWSER_BUNDLE_SHA256 ?? "").trim().toLowerCase();
const expectedSourceAnchor = String(process.env.VELMERE_A62_EXPECTED_SOURCE_MANIFEST_SHA256 ?? "").trim().toLowerCase();
const confirmation = String(process.env.VELMERE_A62_CONFIRM ?? "");
const sourceBefore = sourceState();
const receipt = { schemaVersion: "velmere.pass36.a62.offline-exact-runtime-dependency-bootstrap-receipt.v2", revisionId: policy.revisionId, generatedAt: new Date().toISOString(), sourceBefore, stages, saleEnabled: false, liveProven: false };
try {
  if (!/^[a-f0-9]{64}$/u.test(expectedSourceAnchor)) throw new Error("a62_missing_external_source_manifest_anchor");
  if (sourceBefore.manifestSha256 !== expectedSourceAnchor) throw new Error("a62_current_source_authority_anchor_mismatch");
  if (!sourceBefore.passed || sourceBefore.mismatches.length) throw new Error(`a62_current_source_authority_mismatch:${sourceBefore.mismatches.length}`);
  if (confirmation !== "I_UNDERSTAND_A62_USES_ONLY_VERIFIED_OFFLINE_RUNTIME_DEPENDENCY_AND_BROWSER_ARTIFACTS") throw new Error("a62_confirmation_token_invalid");
  const inputs = evaluateA62Inputs({ root, policy, nodeArchivePath: nodeArchive || null, dependencyBundlePath: dependencyBundle || null, browserBundlePath: browserBundle || null, expectedBrowserBundleSha256, extractRuntime: false });
  receipt.inputVerification = inputs;
  if (inputs.decision !== policy.decisions.verifiedInputs) throw new Error(`a62_inputs_not_verified:${inputs.decision}`);
  stages.push({ id: "source-and-input-preflight", ok: true, durationMs: 0 });

  mutationStarted = true;
  for (const name of ["runtime", "npm-cache", "tarballs", "browser"]) fs.rmSync(path.join(artifactRoot, name), { recursive: true, force: true });
  for (const name of ["runtime", "npm-cache", "tarballs", "browser"]) fs.mkdirSync(path.join(artifactRoot, name), { recursive: true });

  const runtime = inspectRuntimeArchive({ archivePath: path.resolve(nodeArchive), policy, extractRoot: path.join(artifactRoot, "runtime") });
  const runtimeTreeBefore = snapshotTree(runtime.runtimeRoot);
  stages.push({ id: "exact-runtime-extracted", ok: true, durationMs: 0, detail: { platform: runtime.platformKey, node: runtime.node, npm: runtime.npm, archiveSha256: runtime.sha256, runtimeTreeDigest: runtimeTreeBefore.digest } });

  const dependencies = inspectDependencyBundle({ bundlePath: path.resolve(dependencyBundle), packageLockPath: path.join(root, policy.packageLock.path), policy });
  const browser = inspectBrowserBundle({ bundlePath: path.resolve(browserBundle), expectedBundleSha256: expectedBrowserBundleSha256, packageLockPath: path.join(root, policy.packageLock.path), policy, extractRoot: path.join(artifactRoot, "browser") });
  stages.push({ id: "playwright-browser-bundle-extracted", ok: true, durationMs: 0, detail: { platform: browser.platform, files: browser.files.length, bundleSha256: browser.bundle.sha256 } });

  for (let index = 0; index < dependencies.packages.length; index += 1) {
    const row = dependencies.packages[index];
    const target = path.join(artifactRoot, "tarballs", `${String(index).padStart(4, "0")}-${row.sha256}.tgz`);
    fs.writeFileSync(target, row.bytes, { flag: "wx" });
    run(`cache-add-${String(index).padStart(4, "0")}`, runtime.nodePath, [runtime.npmCliPath, "cache", "add", target, "--cache", path.join(artifactRoot, "npm-cache"), "--ignore-scripts", "--offline", "--no-audit", "--fund=false"], {}, 5 * 60_000);
  }
  stages.push({ id: "dependency-cache-seeded", ok: true, durationMs: 0, detail: { packages: dependencies.packages.length } });

  const exactEnv = buildIsolatedExecutionEnvironment({
    runtimeBin: path.join(runtime.runtimeRoot, runtime.profile.pathDirectoryRelativePath),
    runtimeRoot: runtime.runtimeRoot,
    npmCliPath: runtime.npmCliPath,
    artifactRoot,
    browserExecutable: browser.executablePath,
    sourceManifestSha256: expectedSourceAnchor,
    platform: process.platform,
    parentEnv: process.env,
  });
  fs.mkdirSync(exactEnv.HOME, { recursive: true });
  fs.mkdirSync(exactEnv.TMPDIR, { recursive: true });
  run("offline-npm-ci", runtime.nodePath, [runtime.npmCliPath, "ci", "--offline", "--ignore-scripts", "--cache", path.join(artifactRoot, "npm-cache"), "--no-audit", "--fund=false"], exactEnv);
  run("playwright-browser-launch-smoke", runtime.nodePath, ["scripts/pass36/a62-playwright-browser-smoke.mjs"], exactEnv, 5 * 60_000);
  run("a60-exact-admission", runtime.nodePath, ["scripts/a60-exact-final-byte-build-browser-acceptance.mjs"], exactEnv, 3 * 60 * 60_000);
  const a60Receipt = JSON.parse(fs.readFileSync(path.join(root, "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json"), "utf8"));
  if (a60Receipt.decision !== "VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_BROWSER") throw new Error(`a62_a60_decision_invalid:${a60Receipt.decision}`);
  const runtimeTreeAfter = snapshotTree(runtime.runtimeRoot);
  if (runtimeTreeAfter.digest !== runtimeTreeBefore.digest) throw new Error("a62_runtime_tree_mutated_during_bootstrap");
  receipt.runtimeTree = { before: runtimeTreeBefore.digest, after: runtimeTreeAfter.digest, files: runtimeTreeAfter.files, unchanged: true };
  receipt.a60 = { decision: a60Receipt.decision, sourceUnchanged: a60Receipt.sourceUnchanged, summary: a60Receipt.summary };
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
} finally {
  const sourceAfter = sourceState();
  const sourceUnchanged = sourceBefore.manifestSha256 === sourceAfter.manifestSha256
    && sourceBefore.payload?.aggregateSha256 === sourceAfter.payload?.aggregateSha256
    && sourceAfter.passed === true
    && sourceAfter.mismatches.length === 0;
  receipt.sourceAfter = sourceAfter;
  receipt.sourceUnchanged = sourceUnchanged;
  receipt.failure = failure;
  receipt.summary = { mutationStarted, executedStages: stages.length, passedStages: stages.filter((row) => row.ok).length, sourceUnchanged };
  receipt.decision = failure === null && sourceUnchanged ? policy.decisions.verifiedBootstrap : mutationStarted ? policy.decisions.actionRequired : policy.decisions.blocked;
  receipt.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(artifactRoot, "PASS36_A62_OFFLINE_EXACT_RUNTIME_DEPENDENCY_BOOTSTRAP.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.decision !== policy.decisions.verifiedBootstrap) process.exitCode = 1;
}
