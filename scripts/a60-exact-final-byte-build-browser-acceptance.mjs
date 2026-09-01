#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import {
  a60ChildProcessHasExited,
  assertPathInside,
  assertRegularAbsoluteFile,
  assertSafeOutputPathInsideRoot,
  buildA60ChildEnvironment,
  canonicalJson,
  ensureSafeDirectoryInsideRoot,
  evaluateA60LogSafety,
  evaluateA60ServerTermination,
  evaluateA60Stderr,
  normalizeLoopbackBaseUrl,
  readBoundRegularFileInsideRoot,
  sha256,
  validateA60StageSequence,
  validateA79Environment,
} from "./pass36/a79-exact-build-browser-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./pass36/current-source-authority-lib.mjs";
import { validateA58ResultForA60 } from "./pass36/a58-result-validator.mjs";
import { parseStrictJsonCli } from "./pass36/strict-json-cli.mjs";

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"));
const artifactRoot = path.join(root, "artifacts/pass36/a60");
const logRoot = path.join(artifactRoot, "logs");
const expectedAnchor = String(process.env.VELMERE_A60_EXPECTED_SOURCE_MANIFEST_SHA256 ?? "").trim().toLowerCase();
const confirm = String(process.env.VELMERE_A60_CONFIRM ?? "");
const runtimeRoot = String(process.env.VELMERE_A79_RUNTIME_ROOT ?? "").trim();
const npmCliPath = String(process.env.VELMERE_A79_NPM_CLI_PATH ?? "").trim();
const browserExecutable = String(process.env.VELMERE_PLAYWRIGHT_EXECUTABLE_PATH ?? "").trim();
const npmScriptShell = String(process.env.npm_config_script_shell ?? "").trim();
const forcedRuntimeMismatch = process.env.VELMERE_A60_TEST_FORCE_RUNTIME_MISMATCH === "1";
const requestedTestReceiptPath = String(process.env.VELMERE_A60_TEST_RECEIPT_RELATIVE_PATH ?? "").trim().replaceAll("\\", "/");
const canonicalReceiptRelativePath = "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json";
const testReceiptPathValid = requestedTestReceiptPath === "" || (forcedRuntimeMismatch && /^artifacts\/pass36\/a60-test\/PASS36_A60_FORCED_PREFLIGHT_TEST-[a-f0-9]{16}\.json$/u.test(requestedTestReceiptPath));
const receiptRelativePath = requestedTestReceiptPath && testReceiptPathValid ? requestedTestReceiptPath : canonicalReceiptRelativePath;
const stages = [];
let server = null;
let serverPort = null;
let serverStdoutDescriptor = null;
let serverStderrDescriptor = null;
let mutationStarted = false;
let baseUrl = null;
let runtimeInstanceSha256 = null;
let runNonceSha256 = null;
let runtimeProbeSha256 = null;
let runtimeProbeBefore = null;
let runtimeProbeAfter = null;
let browserExecutableSha256 = null;
let buildId = null;

function exactNpmVersion() {
  const run = spawnSync(process.execPath, [npmCliPath, "--version"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: buildA60ChildEnvironment(process.env),
    shell: false,
  });
  if (run.status !== 0) throw new Error(`a79_npm_version_failed:${run.status ?? "null"}`);
  if (!evaluateA60Stderr("exact-npm-version", Buffer.from(run.stderr ?? "", "utf8")).passed) throw new Error("a79_npm_version_stderr_rejected");
  return String(run.stdout ?? "").trim();
}

function stableFailureCode(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /^[a-z0-9_.:-]{1,256}$/iu.test(message) ? message : "unclassified_local_execution_failure";
}

function stageLogDigest(id, suffix) {
  const relativePath = `artifacts/pass36/a60/logs/${id}.${suffix}.log`;
  try {
    const snapshot = readBoundRegularFileInsideRoot(root, relativePath, { maxBytes: 128 * 1024 * 1024, label: "a60_stage_log_digest" });
    return { path: snapshot.path, bytes: snapshot.byteLength, sha256: snapshot.sha256 };
  } catch { return null; }
}

function validateTypeScriptArtifact(expectedRootFiles, minimumTransitiveFiles, timing) {
  let artifactSnapshot;
  try { artifactSnapshot = readBoundRegularFileInsideRoot(root, "artifacts/pass13/PASS13_PARTITIONED_TYPESCRIPT.json", { maxBytes: 16 * 1024 * 1024, label: "a60_typescript_artifact" }); }
  catch { throw new Error("a60_typescript_artifact_missing_or_unsafe"); }
  const value = parseStrictJsonCli(artifactSnapshot.bytes.toString("utf8"), {
    maxBytes: 16 * 1024 * 1024,
    maxDepth: 128,
    maxNodes: 1500000,
    requireObject: true,
  });
  const generatedAt = Date.parse(String(value.generatedAt ?? ""));
  if (!Number.isFinite(generatedAt) || generatedAt < timing.startedAt - 5000 || generatedAt > timing.completedAt + 5000) throw new Error("a60_typescript_artifact_not_fresh");
  if (value.schemaVersion !== "velmere.pass13.partitioned-typescript.v1" || value.ok !== true) throw new Error("a60_typescript_artifact_contract");
  if (value.typescriptVersion !== "5.9.3" || value.partitionCount !== 18 || value.partitions?.length !== 18) throw new Error("a60_typescript_partition_contract");
  if (value.configuredRootFiles !== expectedRootFiles || value.rootFilesCovered !== expectedRootFiles) throw new Error("a60_typescript_root_denominator_mismatch");
  if (!Number.isInteger(value.transitiveFirstPartyFiles) || value.transitiveFirstPartyFiles < minimumTransitiveFiles) throw new Error("a60_typescript_transitive_denominator_collapse");
  if (!Number.isInteger(value.toolingSyntaxFiles) || value.toolingSyntaxFiles < policy.typescript.minimumToolingSyntaxFiles) throw new Error("a60_typescript_tooling_denominator_collapse");
  if (value.toolingSyntaxErrors?.length !== 0 || value.sourceImmutable !== true || value.sourceBefore !== value.sourceAfter) throw new Error("a60_typescript_integrity_contract");
  if (!value.partitions.every((part) => part.exitCode === 0 && part.signal === null && part.timedOut === false && Array.isArray(part.diagnostics) && part.diagnostics.length === policy.typescript.maximumDiagnostics)) throw new Error("a60_typescript_diagnostics_present");
  return true;
}

function runStage(id, args, options = {}) {
  const startedAt = Date.now();
  const command = process.execPath;
  const run = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: options.timeoutMs ?? 45 * 60_000,
    maxBuffer: 128 * 1024 * 1024,
    env: buildA60ChildEnvironment(process.env, options.env ?? {}),
    shell: false,
    windowsHide: true,
  });
  const rawStdout = Buffer.from(run.stdout ?? "", "utf8");
  const rawStderr = Buffer.from(run.stderr ?? "", "utf8");
  const stdoutSafety = evaluateA60LogSafety(rawStdout);
  const stderrPolicy = evaluateA60Stderr(id, rawStderr);
  const persistedStdout = stdoutSafety.safeToPersist ? rawStdout : Buffer.from(`${JSON.stringify({ redacted: true, reason: "sensitive_stdout_rejected", bytes: rawStdout.length, sha256: sha256(rawStdout) })}\n`, "utf8");
  const persistedStderr = stderrPolicy.safeToPersist ? rawStderr : Buffer.from(`${JSON.stringify({ redacted: true, reason: "sensitive_stderr_rejected", bytes: rawStderr.length, sha256: sha256(rawStderr) })}\n`, "utf8");
  fs.writeFileSync(path.join(logRoot, `${id}.stdout.log`), persistedStdout, { flag: "wx" });
  fs.writeFileSync(path.join(logRoot, `${id}.stderr.log`), persistedStderr, { flag: "wx" });
  let outputContractPassed = true;
  let outputContractError = null;
  if (typeof options.validateStdout === "function") {
    try { outputContractPassed = options.validateStdout(String(run.stdout ?? ""), { startedAt, completedAt: Date.now() }) === true; }
    catch (error) {
      outputContractPassed = false;
      outputContractError = stableFailureCode(error);
    }
  }
  const row = {
    id,
    startedAtMs: startedAt,
    completedAtMs: Date.now(),
    command: ["<EXACT_NODE>", ...args.map((argument) => argument === npmCliPath ? "<EXACT_NPM_CLI>" : argument)],
    exitCode: run.status,
    signal: run.signal,
    errorCode: run.error?.code ?? null,
    durationMs: Date.now() - startedAt,
    stdout: stageLogDigest(id, "stdout"),
    stderr: stageLogDigest(id, "stderr"),
    stdoutSafety,
    stderrPolicy,
    outputContractPassed,
    outputContractError,
    ok: run.status === 0 && stdoutSafety.passed && stderrPolicy.passed && outputContractPassed,
  };
  stages.push(row);
  if (!row.ok) throw new Error(`stage_failed:${id}`);
  return row;
}

function runNpmStage(id, npmArgs, options = {}) {
  return runStage(id, [npmCliPath, ...npmArgs], options);
}

async function reserveLoopbackPort() {
  return await new Promise((resolve, reject) => {
    const reservation = net.createServer();
    reservation.unref();
    reservation.once("error", reject);
    reservation.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = reservation.address();
      const port = typeof address === "object" && address ? address.port : null;
      reservation.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < 180_000) {
    if (!server || server.exitCode !== null) throw new Error(`spawned_server_exited:${server?.exitCode ?? "missing"}`);
    try {
      const response = await fetch(`${baseUrl}/pl`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
      const observedProbe = response.headers.get("x-velmere-a60-runtime-probe");
      if (response.status >= 200 && response.status < 400 && response.url === `${baseUrl}/pl` && observedProbe === runtimeProbeSha256) {
        return { status: response.status, url: response.url, runtimeProbeSha256: observedProbe, durationMs: Date.now() - startedAt };
      }
      last = observedProbe === runtimeProbeSha256 ? `status_${response.status}` : "runtime_probe_mismatch";
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server_not_ready:${last ?? "unknown"}`);
}

async function stopServer() {
  if (!server) {
    for (const descriptor of [serverStdoutDescriptor, serverStderrDescriptor]) if (Number.isInteger(descriptor)) { try { fs.closeSync(descriptor); } catch (ignoredError) { void ignoredError; } }
    serverStdoutDescriptor = null; serverStderrDescriptor = null;
    return { attempted: false, passed: true, processExited: true, portClosed: true, terminationExitCode: null, terminationStderrBytes: 0 };
  }
  const wasRunning = !a60ChildProcessHasExited(server);
  let terminationExitCode = null;
  let terminationStderrBytes = 0;
  if (wasRunning && process.platform === "win32" && server.pid) {
    const termination = spawnSync(path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(server.pid), "/T", "/F"], {
      encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024, env: buildA60ChildEnvironment(process.env), shell: false, windowsHide: true,
    });
    terminationExitCode = termination.status;
    terminationStderrBytes = Buffer.byteLength(termination.stderr ?? "");
  } else if (wasRunning) {
    try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill("SIGTERM"); } catch (ignoredError) { void ignoredError; } }
  }
  const deadline = Date.now() + 15_000;
  while (!a60ChildProcessHasExited(server) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  if (!a60ChildProcessHasExited(server) && process.platform !== "win32") {
    try { process.kill(-server.pid, "SIGKILL"); } catch (ignoredError) { void ignoredError; }
    const killDeadline = Date.now() + 5_000;
    while (!a60ChildProcessHasExited(server) && Date.now() < killDeadline) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  for (const descriptor of [serverStdoutDescriptor, serverStderrDescriptor]) {
    if (Number.isInteger(descriptor)) { try { fs.closeSync(descriptor); } catch (ignoredError) { void ignoredError; } }
  }
  serverStdoutDescriptor = null;
  serverStderrDescriptor = null;
  let portClosed = serverPort === null;
  const portClosureProbes = [];
  if (serverPort !== null) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const probe = await new Promise((resolve) => {
        const socket = net.createConnection({ host: "127.0.0.1", port: serverPort });
        let settled = false;
        const finish = (result) => { if (settled) return; settled = true; socket.destroy(); resolve(result); };
        socket.setTimeout(2_000, () => finish({ closed: false, outcome: "timeout_unknown" }));
        socket.once("error", (error) => finish({ closed: error?.code === "ECONNREFUSED", outcome: error?.code ?? "socket_error_unknown" }));
        socket.once("connect", () => finish({ closed: false, outcome: "connection_succeeded" }));
      });
      portClosureProbes.push(probe);
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    portClosed = portClosureProbes.length === 3 && portClosureProbes.every((row) => row.closed === true && row.outcome === "ECONNREFUSED");
  }
  const termination = evaluateA60ServerTermination({
    wasRunning,
    serverExitCode: server.exitCode,
    serverSignalCode: server.signalCode,
    portClosed,
    terminationExitCode,
    terminationStderrBytes,
  });
  return {
    attempted: true,
    ...termination,
    portClosed,
    portClosureProbes,
    wasRunning,
    terminationExitCode,
    terminationStderrBytes,
    serverExitCode: server.exitCode,
    serverSignalCode: server.signalCode,
  };
}

function writeBoundEvidenceReceipt(relativePath, bytes) {
  const parts = relativePath.replaceAll("\\", "/").split("/");
  ensureSafeDirectoryInsideRoot(root, parts.slice(0, -1).join("/"), { label: "a60_receipt_directory" });
  const absolute = path.join(root, ...parts);
  const descriptor = fs.openSync(absolute, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
  try {
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n) throw new Error("a60_receipt_target_not_regular");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return readBoundRegularFileInsideRoot(root, relativePath, { maxBytes: 32 * 1024 * 1024, label: "a60_receipt" });
}

function readBuildId() {
  const runtimeOutput = policy.runtimeBuildOutput;
  if (runtimeOutput?.mode !== "turbopack" || runtimeOutput?.distDir !== ".next-pass25-turbopack" || runtimeOutput?.buildIdPath !== ".next-pass25-turbopack/BUILD_ID" || runtimeOutput?.genericNextAliasForbidden !== true) throw new Error("a79_runtime_build_output_policy_invalid");
  let snapshot;
  try { snapshot = readBoundRegularFileInsideRoot(root, runtimeOutput.buildIdPath, { maxBytes: 1024, label: "a79_next_build_id" }); }
  catch { throw new Error("a79_next_build_id_missing_or_unsafe"); }
  const value = snapshot.bytes.toString("utf8").trim();
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(value)) throw new Error("a79_next_build_id_invalid");
  return value;
}

const sourceBefore = validateCurrentSourceAuthorityExact(root);
const receipt = {
  schemaVersion: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3",
  revisionId: policy.revisionId,
  hardeningRevisionId: "VELMERE_PASS36_A79R0_EXACT_FINAL_BYTE_BUILD_RUNTIME_AND_BROWSER_EVIDENCE_BINDING_HARDENING",
  receiptRelativePath,
  generatedAt: new Date().toISOString(),
  runtime: {
    node: process.versions.node,
    npm: null,
    expected: policy.expectedRuntime,
    runtimeRootClass: "PINNED_EXTERNAL_EXACT_RUNTIME_ROOT",
    nodeExecutable: { fileName: path.basename(process.execPath), byteLength: fs.statSync(process.execPath).size, sha256: sha256(fs.readFileSync(process.execPath)) },
    npmCli: null,
    npmScriptShell: null,
  },
  sourceBefore,
  stages,
  saleEnabled: false,
  liveProven: false,
};
let failure = null;
try {
  if (!testReceiptPathValid || (requestedTestReceiptPath && !forcedRuntimeMismatch)) throw new Error("a60_test_receipt_path_invalid");
  if (forcedRuntimeMismatch) throw new Error("forced_runtime_mismatch");
  if (process.env.VELMERE_A60_BASE_URL || process.env.VELMERE_A45_BASE_URL) throw new Error("a79_external_base_url_override_forbidden");
  if (process.versions.node !== policy.expectedRuntime.node) throw new Error(`wrong_node:${process.versions.node}`);
  assertRegularAbsoluteFile(process.execPath, "node_executable");
  assertRegularAbsoluteFile(npmCliPath, "npm_cli");
  assertRegularAbsoluteFile(browserExecutable, "browser_executable");
  if (process.platform === "win32") {
    if (npmScriptShell) throw new Error("a79_windows_custom_npm_script_shell_forbidden");
  } else {
    const shellMetadata = assertRegularAbsoluteFile(npmScriptShell, "npm_script_shell");
    if ((shellMetadata.mode & 0o111) === 0) throw new Error("a79_npm_script_shell_not_executable");
    receipt.runtime.npmScriptShell = {
      fileName: path.basename(npmScriptShell),
      byteLength: shellMetadata.size,
      sha256: sha256(fs.readFileSync(npmScriptShell)),
      executionClass: "PINNED_EXTERNAL_POSIX_SCRIPT_SHELL",
    };
  }
  assertPathInside(process.execPath, runtimeRoot, "node_executable");
  assertPathInside(npmCliPath, runtimeRoot, "npm_cli");
  receipt.runtime.npmCli = { fileName: path.basename(npmCliPath), byteLength: fs.statSync(npmCliPath).size, sha256: sha256(fs.readFileSync(npmCliPath)) };
  const envValidation = validateA79Environment(process.env, { runtimeRoot, npmCliPath, browserExecutable, npmScriptShell: npmScriptShell || null });
  receipt.environmentValidation = envValidation;
  if (!envValidation.passed) throw new Error("a79_isolated_environment_invalid");
  const npmVersion = exactNpmVersion();
  receipt.runtime.npm = npmVersion;
  if (npmVersion !== policy.expectedRuntime.npm) throw new Error(`wrong_npm:${npmVersion}`);
  browserExecutableSha256 = sha256(fs.readFileSync(browserExecutable));
  if (!/^[a-f0-9]{64}$/u.test(expectedAnchor)) throw new Error("missing_external_source_manifest_anchor");
  if (sourceBefore.manifestSha256 !== expectedAnchor) throw new Error("current_source_authority_anchor_mismatch");
  if (!sourceBefore.passed || sourceBefore.mismatches.length) throw new Error(`current_source_authority_mismatch:${sourceBefore.mismatches.length}`);
  if (confirm !== "I_UNDERSTAND_A60_RUNS_EXACT_LOCAL_BUILDS_AND_BROWSER_TESTS_WITH_NO_LIVE_OR_SALE_CREDIT") throw new Error("confirmation_token_invalid");
  const preflightCompletedAtMs = Date.now();
  stages.push({ id: "source-manifest-preflight", ok: true, startedAtMs: preflightCompletedAtMs, completedAtMs: preflightCompletedAtMs, durationMs: 0, detail: sourceBefore });
  runNonceSha256 = sha256(crypto.randomBytes(32));
  runtimeProbeSha256 = sha256(canonicalJson({ sourceManifestSha256: sourceBefore.manifestSha256, nodeExecutableSha256: receipt.runtime.nodeExecutable.sha256, runNonceSha256 }));

  assertSafeOutputPathInsideRoot(root, "artifacts/pass35/a45", { label: "a45_artifact_root" });
  assertSafeOutputPathInsideRoot(root, "artifacts/pass36/a60/logs", { label: "a60_log_root" });
  mutationStarted = true;
  ensureSafeDirectoryInsideRoot(root, "artifacts/pass35/a45", { requireNewLeaf: true, label: "a45_artifact_root" });
  ensureSafeDirectoryInsideRoot(root, "artifacts/pass36/a60/logs", { requireNewLeaf: true, label: "a60_log_root" });

  runNpmStage("npm-ci", ["ci", "--offline", "--ignore-scripts", "--no-audit", "--fund=false"]);
  runNpmStage("lint", ["run", "lint"]);
  runNpmStage("typecheck", ["run", "typecheck"], {
    validateStdout: (_stdout, timing) => validateTypeScriptArtifact(policy.typescript.preBuildExpectedRootFiles, policy.typescript.preBuildMinimumTransitiveFirstPartyFiles, timing),
  });
  runStage("a58-current-integrity", ["scripts/pass36/verify-a58-release-integrity.mjs"], {
    validateStdout: (stdout) => validateA58ResultForA60(
      parseStrictJsonCli(stdout, { maxBytes: 16 * 1024 * 1024, maxDepth: 96, maxNodes: 1000000, requireObject: true }),
      policy,
    ),
  });
  runNpmStage("a59-contract", ["run", "test:pass36:a59"]);
  runNpmStage("a60-contract", ["run", "test:pass36:a60"]);
  runNpmStage("build-webpack", ["run", "build:webpack"], { env: { VELMERE_A60_RUNTIME_PROBE_SHA256: runtimeProbeSha256 } });
  runNpmStage("build-turbopack", ["run", "build:turbopack"], { env: { VELMERE_A60_RUNTIME_PROBE_SHA256: runtimeProbeSha256 } });
  runNpmStage("post-build-typecheck", ["run", "typecheck"], {
    validateStdout: (_stdout, timing) => validateTypeScriptArtifact(policy.typescript.postDualBuildExpectedRootFiles, policy.typescript.postDualBuildMinimumTransitiveFirstPartyFiles, timing),
  });
  buildId = readBuildId();
  const runtimeBuildEnv = {
    VELMERE_RUNTIME_BUILD_SCOPE: policy.runtimeBuildOutput.mode,
    VELMERE_RUNTIME_DIST_DIR: policy.runtimeBuildOutput.distDir,
    VELMERE_RUNTIME_BUILD_ID: buildId,
  };

  const port = await reserveLoopbackPort();
  serverPort = port;
  baseUrl = normalizeLoopbackBaseUrl(`http://127.0.0.1:${port}`);
  runtimeInstanceSha256 = sha256(canonicalJson({
    nodeExecutableSha256: receipt.runtime.nodeExecutable.sha256,
    npmCliSha256: receipt.runtime.npmCli.sha256,
    browserExecutableSha256,
    sourceManifestSha256: sourceBefore.manifestSha256,
    buildId,
    baseUrl,
    runNonceSha256,
    runtimeProbeSha256,
  }));
  const browserEnv = {
    VELMERE_A45_BASE_URL: baseUrl,
    VELMERE_A45_QA_FIXTURE_PATH: policy.browser.qaFixture.relativePath,
    VELMERE_A45_QA_FIXTURE_GENERATE: policy.browser.qaFixture.generate ? "1" : "0",
    VELMERE_A79_SOURCE_MANIFEST_SHA256: sourceBefore.manifestSha256,
    VELMERE_A79_RUNTIME_INSTANCE_SHA256: runtimeInstanceSha256,
    VELMERE_A79_BROWSER_EXECUTABLE_SHA256: browserExecutableSha256,
    VELMERE_A79_BUILD_ID: buildId,
  };
  serverStdoutDescriptor = fs.openSync(path.join(logRoot, "production-server.stdout.log"), "wx");
  try { serverStderrDescriptor = fs.openSync(path.join(logRoot, "production-server.stderr.log"), "wx"); }
  catch (error) { fs.closeSync(serverStdoutDescriptor); serverStdoutDescriptor = null; throw error; }
  const serverStartedAtMs = Date.now();
  server = spawn(process.execPath, [npmCliPath, "run", "start", "--", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", serverStdoutDescriptor, serverStderrDescriptor],
    env: buildA60ChildEnvironment(process.env, { ...browserEnv, ...runtimeBuildEnv, VELMERE_A60_RUNTIME_PROBE_SHA256: runtimeProbeSha256, PORT: String(port), HOSTNAME: "127.0.0.1" }),
    windowsHide: true,
  });
  const ready = await waitForServer();
  runtimeProbeBefore = ready;
  stages.push({ id: "production-server-ready", ok: true, startedAtMs: serverStartedAtMs, completedAtMs: Date.now(), durationMs: ready.durationMs, detail: { ...ready, baseUrl, buildId, runtimeBuildMode: policy.runtimeBuildOutput.mode, runtimeDistDir: policy.runtimeBuildOutput.distDir, runtimeInstanceSha256 } });
  const smokePort = await reserveLoopbackPort();
  runStage("runtime-smoke", [policy.runtimeSmoke.runnerPath, policy.runtimeSmoke.mode], {
    env: { VELMERE_SMOKE_PORT: String(smokePort) },
    validateStdout: (stdout) => {
      const value = parseStrictJsonCli(stdout, { maxBytes: 1024 * 1024, maxDepth: 32, maxNodes: 10000, requireObject: true });
      return value.status === "PASS"
        && value.mode === policy.runtimeSmoke.mode
        && value.buildId === buildId
        && value.assertions === policy.runtimeSmoke.requiredUniqueAssertions
        && value.results === policy.runtimeSmoke.requiredUniqueResults
        && value.uniqueAssertions === policy.runtimeSmoke.requiredUniqueAssertions
        && value.uniqueResults === policy.runtimeSmoke.requiredUniqueResults
        && Array.isArray(value.failures)
        && value.failures.length === 0;
    },
  });
  runStage("browser-acceptance", ["scripts/a45-browser-acceptance.mjs"], { env: browserEnv });
  runStage("browser-evidence-verification", ["scripts/a60-browser-evidence-verifier.mjs"], {
    env: browserEnv,
    validateStdout: (stdout) => {
      const value = parseStrictJsonCli(stdout, { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
      return value.schemaVersion === "velmere.pass36.a60.browser-evidence-verification.v2"
        && value.status === "PASS_BROWSER_EVIDENCE_EXACTLY_BOUND"
        && value.checks === policy.evidencePackage.browserVerifierChecksRequired
        && value.passed === policy.evidencePackage.browserVerifierChecksRequired
        && value.checkIdentitySha256 === policy.evidencePackage.browserVerifierCheckIdentitySha256
        && Array.isArray(value.failures) && value.failures.length === 0
        && value.saleEnabled === false && value.liveProven === false;
    },
  });
  runtimeProbeAfter = await waitForServer();
} catch (error) {
  failure = stableFailureCode(error);
} finally {
  const cleanup = await stopServer();
  const sourceAfter = validateCurrentSourceAuthorityExact(root);
  const sourceUnchanged = sourceBefore.manifestSha256 === sourceAfter.manifestSha256
    && sourceBefore.payload?.pathSetSha256 === sourceAfter.payload?.pathSetSha256
    && sourceBefore.payload?.aggregateSha256 === sourceAfter.payload?.aggregateSha256
    && sourceAfter.passed === true
    && sourceAfter.mismatches.length === 0;
  let stageValidation = { passed: false, checks: [], failures: [], requiredStages: policy.requiredStages.length, declaredStages: stages.length, notRun: true };
  if (mutationStarted) {
    try {
      stageValidation = validateA60StageSequence({
        root, stages, policy,
        expectedRuntime: { baseUrl, buildId, runtimeBuildMode: policy.runtimeBuildOutput.mode, runtimeDistDir: policy.runtimeBuildOutput.distDir, runtimeInstanceSha256, runtimeProbeSha256 },
      });
    } catch {
      stageValidation = {
        passed: false,
        checks: [{ id: "stage-validation-internal-error", passed: false, detail: "bounded_internal_error" }],
        failures: [{ id: "stage-validation-internal-error", passed: false, detail: "bounded_internal_error" }],
        requiredStages: policy.requiredStages.length,
        declaredStages: stages.length,
        notRun: false,
      };
      if (failure === null) failure = "a60_stage_validation_internal_error";
    }
  }
  if (mutationStarted && failure === null && !cleanup.passed) failure = "a60_server_cleanup_failed";
  if (mutationStarted && failure === null && stages.some((row) => row.id === "production-server-ready") && cleanup.wasRunning !== true) failure = "a60_server_exited_before_controlled_cleanup";
  if (mutationStarted && failure === null && !stageValidation.passed) failure = "a60_stage_sequence_or_log_validation_failed";
  const preflightFailure = !mutationStarted;
  receipt.sourceAfter = sourceAfter;
  receipt.sourceUnchanged = sourceUnchanged;
  const optionalBinding = (relativePath, label, maxBytes = 128 * 1024 * 1024) => {
    try {
      const snapshot = readBoundRegularFileInsideRoot(root, relativePath, { maxBytes, label });
      return { relativePath, byteLength: snapshot.byteLength, sha256: snapshot.sha256 };
    } catch { return null; }
  };
  const qaFixtureSnapshot = optionalBinding(policy.browser.qaFixture.relativePath, "a60_qa_fixture", 8 * 1024 * 1024);
  const qaFixtureBinding = qaFixtureSnapshot ? {
    ...qaFixtureSnapshot,
    generatorId: policy.browser.qaFixture.generatorId,
    providerCredit: false, durableStorageCredit: false, realDataCredit: false, liveCredit: false, saleCredit: false,
  } : null;
  const browserReceiptBinding = optionalBinding("artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json", "a60_browser_receipt", 32 * 1024 * 1024);
  const browserVerifierBinding = optionalBinding("artifacts/pass36/a60/PASS36_A60_BROWSER_EVIDENCE_VERIFICATION.json", "a60_browser_verifier", 32 * 1024 * 1024);
  const serverStdoutBinding = optionalBinding("artifacts/pass36/a60/logs/production-server.stdout.log", "a60_server_stdout");
  const serverStderrBinding = optionalBinding("artifacts/pass36/a60/logs/production-server.stderr.log", "a60_server_stderr");
  const serverStdoutSafety = (() => {
    try { return evaluateA60LogSafety(readBoundRegularFileInsideRoot(root, "artifacts/pass36/a60/logs/production-server.stdout.log", { maxBytes: 128 * 1024 * 1024, label: "a60_server_stdout_policy" }).bytes); }
    catch { return null; }
  })();
  const serverStderrPolicy = (() => {
    try { return evaluateA60Stderr("production-server", readBoundRegularFileInsideRoot(root, "artifacts/pass36/a60/logs/production-server.stderr.log", { maxBytes: 1024 * 1024, label: "a60_server_stderr_policy" }).bytes); }
    catch { return null; }
  })();
  receipt.bindings = {
    baseUrl, runtimeInstanceSha256, runNonceSha256, runtimeProbeSha256, runtimeProbeBefore, runtimeProbeAfter, browserExecutableSha256, buildId,
    runtimeBuildMode: policy.runtimeBuildOutput.mode, runtimeDistDir: policy.runtimeBuildOutput.distDir,
    qaFixture: qaFixtureBinding, browserReceipt: browserReceiptBinding, browserVerifier: browserVerifierBinding,
    productionServerLogs: { stdout: serverStdoutBinding, stderr: serverStderrBinding, stdoutSafety: serverStdoutSafety, stderrPolicy: serverStderrPolicy },
  };
  receipt.cleanup = cleanup;
  receipt.stageValidation = { passed: stageValidation.passed, checks: stageValidation.checks.length, requiredStages: stageValidation.requiredStages, declaredStages: stageValidation.declaredStages, failureIds: stageValidation.failures.map((row) => row.id), notRun: stageValidation.notRun === true };
  const requiredBindingsPresent = qaFixtureBinding !== null && browserReceiptBinding !== null && browserVerifierBinding !== null && serverStdoutBinding !== null && serverStderrBinding !== null && serverStdoutSafety?.passed === true && serverStderrPolicy?.passed === true;
  const decisionFailures = [];
  if (failure !== null) decisionFailures.push({ id: failure, class: "orchestration" });
  if (!sourceUnchanged) decisionFailures.push({ id: "a60_source_changed_or_invalid", class: "source_integrity" });
  if (mutationStarted && !cleanup.passed) decisionFailures.push({ id: "a60_cleanup_not_proven", class: "cleanup" });
  if (mutationStarted && !stageValidation.passed) decisionFailures.push({ id: "a60_stage_validation_not_proven", class: "stage_authority" });
  if (mutationStarted && !requiredBindingsPresent) decisionFailures.push({ id: "a60_required_evidence_binding_missing", class: "evidence_binding" });
  receipt.decisionFailures = decisionFailures;
  receipt.failure = decisionFailures[0]?.id ?? null;
  receipt.decision = decisionFailures.length === 0 && mutationStarted
    ? "VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_BROWSER"
    : preflightFailure
      ? "BLOCKED_EXACT_PREFLIGHT"
      : "ACTION_REQUIRED";
  receipt.summary = {
    requiredStages: policy.requiredStages.length,
    executedStages: stages.length,
    passedStages: stages.filter((row) => row.ok).length,
    failedStages: stages.filter((row) => !row.ok).length,
    mutationStarted,
    sourceUnchanged,
    exactStageSequence: stageValidation.passed,
    orchestrationFailure: failure,
    decisionFailureCount: decisionFailures.length,
    missingStages: policy.requiredStages.filter((id) => !stages.some((row) => row.id === id)),
  };
  receipt.completedAt = new Date().toISOString();
  receipt.preflightEvidenceWriteOnly = preflightFailure;
  try {
    writeBoundEvidenceReceipt(receiptRelativePath, Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"));
  } catch (error) {
    const writeFailure = stableFailureCode(error);
    receipt.decisionFailures = [...decisionFailures, { id: writeFailure, class: "evidence_write" }];
    receipt.failure = writeFailure;
    receipt.summary.decisionFailureCount = receipt.decisionFailures.length;
    receipt.decision = mutationStarted ? "ACTION_REQUIRED_EVIDENCE_WRITE" : "BLOCKED_EXACT_PREFLIGHT_EVIDENCE_WRITE";
    process.exitCode = 1;
  }
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.decision !== "VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_BROWSER") process.exitCode = 1;
}
