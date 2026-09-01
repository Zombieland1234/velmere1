#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const POLICY_PATH = path.join(ROOT, 'config', 'p41', 'p41-exact-windows-current-root-closure-policy.json');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'p41-exact-windows-node24-current-root-closure.yml');
const DEFAULT_OUTPUT = path.join(ROOT, 'p41-out', 'P41_EXACT_WINDOWS_NODE24_CURRENT_ROOT_RECEIPT.json');

function parseArgs(argv) {
  const result = { output: DEFAULT_OUTPUT, selfTest: false, simulateFailure: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output') result.output = path.resolve(argv[++index]);
    else if (arg === '--self-test') result.selfTest = true;
    else if (arg === '--simulate-failure') result.simulateFailure = argv[++index] || 'requested';
    else throw new Error(`unknown_argument:${arg}`);
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const outputPath = args.output;
const outDir = path.dirname(outputPath);
const logsDir = path.join(outDir, 'logs');
const casDir = path.join(outDir, 'cas');
const npmCacheDir = path.join(outDir, 'npm-cache');
for (const directory of [outDir, logsDir, casDir, npmCacheDir]) fs.mkdirSync(directory, { recursive: true });

const startedAt = new Date().toISOString();
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readBytes = (file) => fs.readFileSync(file);
const fileSha256 = (file) => sha256(readBytes(file));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const receipt = {
  schemaVersion: 'velmere.p41.exact-windows-node24-current-root-receipt.v1',
  revision: 'P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR',
  startedAt,
  endedAt: null,
  status: 'IN_PROGRESS',
  classification: args.selfTest ? 'PORTABLE_BRIDGE_SELF_TEST_ONLY' : 'EXACT_WINDOWS_CURRENT_ROOT_EXECUTION',
  parentRoot: 'R44P46',
  ownerDirective: 'V16',
  runtime: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: null,
    runnerName: process.env.RUNNER_NAME || null,
    runnerOs: process.env.RUNNER_OS || null,
    imageOs: process.env.ImageOS || null,
    githubRunId: process.env.GITHUB_RUN_ID || null,
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    githubSha: process.env.GITHUB_SHA || null,
  },
  bindings: {},
  dependencyDenominator: {},
  stages: [],
  firstFailure: null,
  limitations: [
    'A portable self-test proves bridge logic only and never grants exact Windows, dependency, build, Browser, PDF, customer-output, sale or release credit.',
    'A normal PASS remains limited to the commands physically executed and does not grant source-rights, paid-value, Browser/PDF, GO_PAID, LIVE or WORLD_CLASS_PROVEN credit.',
  ],
  releaseDecision: {
    goInternal: false,
    finalAiValidationReady: false,
    pilotReady: false,
    goPaid: false,
    live: false,
    worldClassProven: false,
  },
};

function checkpoint() {
  receipt.endedAt = new Date().toISOString();
  writeJson(outputPath, receipt);
}

function fail(error, stage = 'UNCLASSIFIED') {
  const rendered = String(error?.stack || error);
  if (!receipt.firstFailure) receipt.firstFailure = { stage, error: rendered };
  receipt.status = 'FAIL';
  receipt.classification = args.selfTest
    ? 'PORTABLE_BRIDGE_SELF_TEST_FAIL'
    : 'EXACT_WINDOWS_CURRENT_ROOT_EXECUTION_FAIL';
  checkpoint();
  return rendered;
}

function run(command, commandArgs, stage, options = {}) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const logPath = path.join(logsDir, `${String(receipt.stages.length + 1).padStart(2, '0')}-${stage}.json`);
  const stageRecord = {
    stage,
    command: [executable, ...commandArgs],
    cwd: options.cwd || ROOT,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: null,
    signal: null,
    stdoutSha256: null,
    stderrSha256: null,
    stdoutTail: null,
    stderrTail: null,
  };
  const result = spawnSync(executable, commandArgs, {
    cwd: options.cwd || ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, ...(options.env || {}) },
  });
  stageRecord.endedAt = new Date().toISOString();
  stageRecord.status = result.status;
  stageRecord.signal = result.signal;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  stageRecord.stdoutSha256 = sha256(Buffer.from(stdout, 'utf8'));
  stageRecord.stderrSha256 = sha256(Buffer.from(stderr, 'utf8'));
  stageRecord.stdoutTail = stdout.slice(-12000);
  stageRecord.stderrTail = stderr.slice(-12000);
  writeJson(logPath, { ...stageRecord, stdout, stderr });
  receipt.stages.push({ ...stageRecord, logPath: path.relative(ROOT, logPath).replaceAll('\\', '/') });
  checkpoint();
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${stage}_failed_exit_${result.status}: ${(stderr || stdout).slice(-6000)}`);
  }
  return result;
}

function deriveDependencies(lock) {
  const grouped = new Map();
  let lockPathsWithResolvedIntegrity = 0;
  for (const [lockPath, entry] of Object.entries(lock.packages || {})) {
    if (!lockPath || !entry || typeof entry !== 'object') continue;
    if (!entry.resolved || !entry.integrity) continue;
    lockPathsWithResolvedIntegrity += 1;
    const key = `${entry.resolved}\n${entry.integrity}`;
    const row = grouped.get(key) || { resolved: entry.resolved, integrity: entry.integrity, lockPaths: [] };
    row.lockPaths.push(lockPath);
    grouped.set(key, row);
  }
  const rows = [...grouped.values()];
  for (const row of rows) row.lockPaths.sort();
  rows.sort((left, right) => left.resolved.localeCompare(right.resolved) || left.integrity.localeCompare(right.integrity));
  return { lockPathsWithResolvedIntegrity, rows };
}

function selectSriToken(integrity) {
  const tokens = String(integrity || '').split(/\s+/).filter(Boolean);
  for (const algorithm of ['sha512', 'sha384', 'sha256', 'sha1']) {
    const token = tokens.find((candidate) => candidate.startsWith(`${algorithm}-`));
    if (token) return { algorithm, expected: token.slice(algorithm.length + 1), token };
  }
  throw new Error(`unsupported_or_missing_integrity:${integrity}`);
}

function verifySri(bytes, integrity) {
  const { algorithm, expected, token } = selectSriToken(integrity);
  const actual = crypto.createHash(algorithm).update(bytes).digest('base64');
  if (actual !== expected) throw new Error(`sri_mismatch:${token}:${algorithm}-${actual}`);
  return token;
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'velmere-p41-current-root-closure/1.0' },
        signal: AbortSignal.timeout(180000),
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}_${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt * attempt));
    }
  }
  throw new Error(`download_failed:${url}:${String(lastError)}`);
}

async function buildCas(rows) {
  const manifestRows = new Array(rows.length);
  const failures = [];
  let cursor = 0;
  const workerCount = Math.min(12, rows.length);
  async function worker(workerId) {
    while (true) {
      const index = cursor++;
      if (index >= rows.length) return;
      const row = rows[index];
      try {
        if (!/^https?:\/\//i.test(row.resolved)) throw new Error(`unsupported_resolved_url:${row.resolved}`);
        const bytes = await fetchWithRetry(row.resolved);
        const verifiedIntegrity = verifySri(bytes, row.integrity);
        const digest = sha256(bytes);
        const casFile = path.join(casDir, `${digest}.tgz`);
        if (!fs.existsSync(casFile)) fs.writeFileSync(casFile, bytes);
        manifestRows[index] = {
          resolved: row.resolved,
          integrity: row.integrity,
          verifiedIntegrity,
          lockPaths: row.lockPaths,
          byteLength: bytes.length,
          sha256: digest,
          casFile: path.relative(outDir, casFile).replaceAll('\\', '/'),
          workerId,
        };
      } catch (error) {
        failures.push({ index, resolved: row.resolved, integrity: row.integrity, error: String(error?.stack || error) });
      }
      if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
        receipt.casProgress = `${Math.min(index + 1, rows.length)}/${rows.length}`;
        checkpoint();
      }
    }
  }
  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1)));
  const successful = manifestRows.filter(Boolean);
  const manifest = {
    schemaVersion: 'velmere.p41.sri-verified-dependency-cas.v1',
    generatedAt: new Date().toISOString(),
    expectedUniqueTarballs: rows.length,
    downloadedUniqueTarballs: successful.length,
    failures,
    rows: successful,
  };
  writeJson(path.join(outDir, 'P41_DEPENDENCY_CAS_MANIFEST.json'), manifest);
  if (failures.length || successful.length !== rows.length) {
    throw new Error(`dependency_cas_incomplete:${successful.length}/${rows.length}:failures_${failures.length}`);
  }
  return manifest;
}

function staticBridgeSelfTest(policy, packageBytes, lockBytes, lock) {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const runner = fs.readFileSync(new URL(import.meta.url), 'utf8');
  const checks = {
    policyExists: fs.existsSync(POLICY_PATH),
    workflowExists: fs.existsSync(WORKFLOW_PATH),
    packageSha256: sha256(packageBytes) === policy.currentRootBindings.packageJson.sha256,
    lockSha256: sha256(lockBytes) === policy.currentRootBindings.packageLock.sha256,
    workflowWindows2025: /runs-on:\s*windows-2025/.test(workflow),
    workflowExactNode: /node-version:\s*24\.18\.0/.test(workflow),
    workflowExactNpm: /npm@11\.16\.0/.test(workflow),
    workflowReadOnly: /permissions:\s*[\r\n]+\s+contents:\s*read/.test(workflow),
    workflowUploadAlways: /if:\s*always\(\)/.test(workflow),
    workflowCurrentRootRunner: /scripts\/pass41\/run-p41-exact-windows-closure\.mjs/.test(workflow),
    noEmbeddedPayloadWorkflow: !["payload" + ".part", "package" + ".full", "brotli" + "DecompressSync"].some((token) => workflow.includes(token)),
    noEmbeddedPayloadRunner: !["payload" + ".part", "package" + ".full", "brotli" + "DecompressSync"].some((token) => runner.includes(token)),
    failureReceiptWriter: /function checkpoint\(\)/.test(runner) && /function fail\(/.test(runner),
    selfTestMode: /--self-test/.test(runner),
    simulatedFailureMode: /--simulate-failure/.test(runner),
  };
  const dependency = deriveDependencies(lock);
  checks.lockPaths = dependency.lockPathsWithResolvedIntegrity === policy.currentRootBindings.packageLock.lockPathsWithResolvedIntegrity;
  checks.uniqueTarballs = dependency.rows.length === policy.currentRootBindings.packageLock.uniqueResolvedIntegrityTarballs;
  const pass = Object.values(checks).every(Boolean);
  return { pass, checks, denominator: { lockPaths: dependency.lockPathsWithResolvedIntegrity, uniqueTarballs: dependency.rows.length } };
}

let failureStage = 'INITIALIZATION';
try {
  const policy = readJson(POLICY_PATH);
  const packagePath = path.join(ROOT, policy.currentRootBindings.packageJson.path);
  const lockPath = path.join(ROOT, policy.currentRootBindings.packageLock.path);
  const authorityPath = path.join(ROOT, policy.authority.path);
  const packageBytes = readBytes(packagePath);
  const lockBytes = readBytes(lockPath);
  const lock = JSON.parse(lockBytes.toString('utf8'));
  const dependency = deriveDependencies(lock);

  receipt.bindings = {
    policyPath: path.relative(ROOT, POLICY_PATH).replaceAll('\\', '/'),
    policySha256: fileSha256(POLICY_PATH),
    authorityPath: policy.authority.path,
    authoritySha256: fileSha256(authorityPath),
    packageJsonSha256: sha256(packageBytes),
    packageLockSha256: sha256(lockBytes),
    sourceIdentityPath: policy.currentRootBindings.sourceIdentityPath,
    sourceIdentityPresent: fs.existsSync(path.join(ROOT, policy.currentRootBindings.sourceIdentityPath)),
  };
  receipt.dependencyDenominator = {
    lockPathsWithResolvedIntegrity: dependency.lockPathsWithResolvedIntegrity,
    uniqueResolvedIntegrityTarballs: dependency.rows.length,
  };

  failureStage = 'CURRENT_ROOT_BINDINGS';
  if (receipt.bindings.authoritySha256 !== policy.authority.sha256) throw new Error('authority_sha256_mismatch');
  if (receipt.bindings.packageJsonSha256 !== policy.currentRootBindings.packageJson.sha256) throw new Error('package_json_sha256_mismatch');
  if (receipt.bindings.packageLockSha256 !== policy.currentRootBindings.packageLock.sha256) throw new Error('package_lock_sha256_mismatch');
  if (packageBytes.length !== policy.currentRootBindings.packageJson.byteLength) throw new Error('package_json_byte_length_mismatch');
  if (lockBytes.length !== policy.currentRootBindings.packageLock.byteLength) throw new Error('package_lock_byte_length_mismatch');
  if (lock.lockfileVersion !== policy.currentRootBindings.packageLock.lockfileVersion) throw new Error('lockfile_version_mismatch');
  if (dependency.lockPathsWithResolvedIntegrity !== policy.currentRootBindings.packageLock.lockPathsWithResolvedIntegrity) throw new Error('lock_path_denominator_mismatch');
  if (dependency.rows.length !== policy.currentRootBindings.packageLock.uniqueResolvedIntegrityTarballs) throw new Error('unique_tarball_denominator_mismatch');
  checkpoint();

  const selfTest = staticBridgeSelfTest(policy, packageBytes, lockBytes, lock);
  receipt.portableBridgeSelfTest = selfTest;
  checkpoint();
  if (!selfTest.pass) throw new Error('portable_bridge_self_test_failed');

  if (args.simulateFailure) {
    failureStage = `SIMULATED_FAILURE_${args.simulateFailure}`;
    throw new Error(`simulated_failure_requested:${args.simulateFailure}`);
  }

  if (args.selfTest) {
    receipt.status = 'PASS';
    receipt.classification = 'PORTABLE_BRIDGE_SELF_TEST_ONLY';
    receipt.credit = {
      currentRootBindings: true,
      lockDenominator: true,
      workflowContract: true,
      failureReceiptContract: true,
      exactWindowsToolchain: false,
      dependencyClosure: false,
      semanticAndBuildClosure: false,
    };
    checkpoint();
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    failureStage = 'EXACT_RUNTIME_ASSERTION';
    const npmVersionResult = run('npm', ['--version'], 'npm-version');
    const npmVersion = (npmVersionResult.stdout || '').trim();
    receipt.runtime.npm = npmVersion;
    if (process.platform !== policy.exactTarget.platform || process.arch !== policy.exactTarget.arch) {
      throw new Error(`exact_windows_arch_mismatch:${process.platform}/${process.arch}`);
    }
    if (process.version !== policy.exactTarget.node) throw new Error(`exact_node_mismatch:${process.version}`);
    if (npmVersion !== policy.exactTarget.npm) throw new Error(`exact_npm_mismatch:${npmVersion}`);
    checkpoint();

    failureStage = 'ONLINE_NPM_CI';
    run('npm', ['ci', '--ignore-scripts', '--audit=false', '--fund=false', '--prefer-online', '--cache', npmCacheDir, '--loglevel=notice'], 'npm-ci-online');

    failureStage = 'OFFLINE_NPM_CI_REPLAY';
    fs.rmSync(path.join(ROOT, 'node_modules'), { recursive: true, force: true });
    run('npm', ['ci', '--offline', '--ignore-scripts', '--audit=false', '--fund=false', '--cache', npmCacheDir, '--loglevel=notice'], 'npm-ci-offline');

    failureStage = 'SRI_VERIFIED_TARBALL_CAS';
    const casManifest = await buildCas(dependency.rows);
    receipt.dependencyClosure = {
      onlineNpmCi: true,
      offlineNpmCiReplay: true,
      sriVerifiedTarballs: `${casManifest.downloadedUniqueTarballs}/${casManifest.expectedUniqueTarballs}`,
      lifecycleScriptsExecuted: false,
      classification: 'DEPENDENCY_GRAPH_OFFLINE_REPLAY_AND_SRI_CAS',
    };
    checkpoint();

    failureStage = 'NPM_LS';
    run('npm', ['ls', '--all', '--json'], 'npm-ls');

    failureStage = 'SEMANTIC_TYPESCRIPT';
    run(policy.commands.typecheck[0], policy.commands.typecheck.slice(1), 'semantic-typescript');

    failureStage = 'ESLINT';
    run(policy.commands.lint[0], policy.commands.lint.slice(1), 'eslint');

    failureStage = 'WEBPACK_PRODUCTION_BUILD';
    run(policy.commands.webpack[0], policy.commands.webpack.slice(1), 'webpack-production-build');

    failureStage = 'TURBOPACK_PRODUCTION_BUILD';
    run(policy.commands.turbopack[0], policy.commands.turbopack.slice(1), 'turbopack-production-build');

    receipt.status = 'PASS';
    receipt.classification = 'EXACT_WINDOWS_CURRENT_ROOT_DEPENDENCY_SEMANTIC_DUAL_BUILD_PASS';
    receipt.credit = {
      exactWindowsToolchain: true,
      exactCurrentRootBindings: true,
      dependencyClosure: true,
      typecheck: true,
      lint: true,
      webpack: true,
      turbopack: true,
      browser: false,
      pdf: false,
      customerOutput: false,
      sourceRights: false,
      materialValue: false,
      goInternal: false,
      goPaid: false,
    };
    checkpoint();
    console.log(JSON.stringify(receipt, null, 2));
  }
} catch (error) {
  console.error(fail(error, failureStage));
  process.exitCode = 1;
} finally {
  receipt.endedAt = new Date().toISOString();
  checkpoint();
}
