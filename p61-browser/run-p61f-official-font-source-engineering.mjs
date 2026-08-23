#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
function arg(name) {
  const index = args.indexOf(name);
  if (index < 0 || index + 1 >= args.length) throw new Error(`missing_argument:${name}`);
  return args[index + 1];
}

const sourceRoot = resolve(arg('--source-root'));
const manifestPath = resolve(arg('--projection-manifest'));
const acquisitionContractPath = resolve(arg('--acquisition-contract'));
const outputRoot = resolve(arg('--output-dir'));
const receiptPath = join(outputRoot, 'P61F_OFFICIAL_MANROPE_SOURCE_ENGINEERING_RECEIPT.json');
const logsRoot = join(outputRoot, 'logs');
mkdirSync(logsRoot, { recursive: true });

const OLD_FONT_SHA = 'a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa';
const NEW_FONT_SHA = '67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250';
const OLD_REVISION = 'VELMERE_PASS36_A102R44P44_ACTION_REQUIRED_BRUTAL_PRODUCT_REALITY_50_CONTRACT_ANGEL120_PERSONA100_FULL_QA_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT';
const NEW_REVISION = 'VELMERE_R44P46_V16_P61F_OFFICIAL_MANROPE_RUNTIME_FONT_ACQUISITION_BROWSER_EXECUTION_NO_SALE_CREDIT';
const RENDERER_PATH = 'lib/search/lens-pdf-renderer.ts';
const POLICY_PATH = 'config/pass36/r44p44-font-asset-boundary.json';
const ACQUISITION_PATH = 'config/pass36/p61f-official-manrope-runtime-font-acquisition.json';
const NEXT_ENV_PATH = 'next-env.d.ts';

const baseline = Object.freeze({
  renderer: { byteLength: 76847, sha256: '1e18d849d232e48cf12b40f5b274141f21353b2d7038d40d3f69103ed71380d3' },
  policy: { byteLength: 878, sha256: 'f7c39b9baa2d57cde30e72bed03ce19e65bd834b9c6035389e4da261747ef008' },
  nextEnv: { byteLength: 262, sha256: 'e02cf94f68fe440954d3213106a7e943e5424cc867d7cd3ab406dc31263e6767' },
});
const patched = Object.freeze({
  renderer: { byteLength: 76847, sha256: '18142581dc6f858df800c684c90bb6c444683758664f45f5eb7b87932f0bd647' },
  policy: { byteLength: 839, sha256: '87a31ecf197a324cf6da23f524431bbedebd1b4bd2c0c002e576d57c0c89372d' },
  generatedNextEnv: { byteLength: 247, sha256: '7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651' },
});

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function sha256File(filePath) {
  return sha256Bytes(readFileSync(filePath));
}
function toPosix(value) {
  return value.split(sep).join('/');
}
function fileIdentity(relativePath) {
  const absolute = join(sourceRoot, ...relativePath.split('/'));
  if (!existsSync(absolute)) return { path: relativePath, exists: false, byteLength: null, sha256: null };
  return { path: relativePath, exists: true, byteLength: statSync(absolute).size, sha256: sha256File(absolute) };
}
function assertIdentity(actual, expected, stage) {
  if (!actual.exists || actual.byteLength !== expected.byteLength || actual.sha256 !== expected.sha256) {
    throw new Error(`identity_mismatch:${stage}:${JSON.stringify(actual)}:${JSON.stringify(expected)}`);
  }
}
function replaceExactlyOnce(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`replacement_anchor_count_mismatch:${label}:${count}`);
  return text.replace(oldValue, newValue);
}
function walkFiles(root, skip = new Set()) {
  const rows = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      const rel = toPosix(relative(root, absolute));
      const top = rel.split('/')[0];
      if (skip.has(top) || top.startsWith('.next')) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) rows.push({ path: rel, absolute });
    }
  };
  visit(root);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
function modifiedProjectionIdentity(manifest, expectedOverrides) {
  const expectedRows = manifest.files.map((row) => expectedOverrides.get(row.path) ?? row);
  const acquisitionBytes = readFileSync(acquisitionContractPath);
  expectedRows.push({ path: ACQUISITION_PATH, byteLength: acquisitionBytes.length, sha256: sha256Bytes(acquisitionBytes) });
  expectedRows.sort((a, b) => a.path.localeCompare(b.path));

  const actualFiles = walkFiles(sourceRoot, new Set(['node_modules']));
  const expectedPaths = new Set(expectedRows.map((row) => row.path));
  const actualPaths = new Set(actualFiles.map((row) => row.path));
  const missing = [...expectedPaths].filter((value) => !actualPaths.has(value)).sort();
  const unexpected = [...actualPaths].filter((value) => !expectedPaths.has(value)).sort();
  const rows = [];
  const mismatches = [];
  let payloadBytes = 0;
  for (const expected of expectedRows) {
    const absolute = join(sourceRoot, ...expected.path.split('/'));
    if (!existsSync(absolute)) continue;
    const observed = { path: expected.path, byteLength: statSync(absolute).size, sha256: sha256File(absolute) };
    rows.push(observed);
    payloadBytes += observed.byteLength;
    if (observed.byteLength !== expected.byteLength || observed.sha256 !== expected.sha256) {
      mismatches.push({
        path: expected.path,
        expectedByteLength: expected.byteLength,
        actualByteLength: observed.byteLength,
        expectedSha256: expected.sha256,
        actualSha256: observed.sha256,
      });
    }
  }
  const pathSetSha256 = sha256Bytes(Buffer.from(rows.map((row) => row.path).join('\n')));
  const aggregate = createHash('sha256');
  for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
  const sourceContentAggregateSha256 = aggregate.digest('hex');
  const pass = missing.length === 0 && unexpected.length === 0 && mismatches.length === 0 && rows.length === expectedRows.length;
  return { pass, fileCount: rows.length, payloadBytes, pathSetSha256, sourceContentAggregateSha256, missing, unexpected, mismatches };
}
function treeFingerprint(root) {
  if (!existsSync(root)) return { exists: false, files: 0, bytes: 0, sha256: null };
  const rows = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) rows.push({ path: toPosix(relative(root, absolute)), absolute });
    }
  };
  visit(root);
  rows.sort((a, b) => a.path.localeCompare(b.path));
  const digest = createHash('sha256');
  let bytes = 0;
  for (const row of rows) {
    const size = statSync(row.absolute).size;
    const sha = sha256File(row.absolute);
    bytes += size;
    digest.update(`${row.path}\0${size}\0${sha}\n`);
  }
  return { exists: true, files: rows.length, bytes, sha256: digest.digest('hex') };
}
async function runStep(receipt, name, command, commandArgs, options = {}) {
  const logPath = join(logsRoot, `${String(receipt.steps.length + 1).padStart(2, '0')}-${name}.log`);
  const log = createWriteStream(logPath, { encoding: 'utf8' });
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const env = { ...process.env, ...(options.env ?? {}) };
  const child = spawn(command, commandArgs, { cwd: sourceRoot, env, windowsHide: true });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000).unref();
  }, timeoutMs);
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', resolveExit);
  });
  clearTimeout(timer);
  log.end();
  await new Promise((resolveFinish, rejectFinish) => {
    log.once('finish', resolveFinish);
    log.once('error', rejectFinish);
  });
  const row = {
    name,
    command: [command, ...commandArgs].join(' '),
    exitCode,
    timedOut,
    durationMs: Date.now() - started,
    log: toPosix(relative(outputRoot, logPath)),
    logSha256: sha256File(logPath),
  };
  receipt.steps.push(row);
  if (timedOut || exitCode !== 0) throw new Error(`step_failed:${name}:exit=${exitCode}:timeout=${timedOut}`);
}
function writeReceipt(receipt) {
  const copy = structuredClone(receipt);
  delete copy.integritySha256;
  receipt.integritySha256 = sha256Bytes(Buffer.from(JSON.stringify(copy, Object.keys(copy).sort())));
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

const receipt = {
  schemaVersion: 'velmere.p61f.official-manrope-source-engineering.v1',
  status: 'IN_PROGRESS',
  decision: 'IN_PROGRESS',
  sourceRoot,
  projectionManifest: { path: manifestPath, sha256: sha256File(manifestPath) },
  acquisitionContract: { path: acquisitionContractPath, byteLength: statSync(acquisitionContractPath).size, sha256: sha256File(acquisitionContractPath) },
  sourceDelta: {},
  hardGates: {
    exactP60BaselineBeforePatch: false,
    deterministicSourcePatch: false,
    acquisitionContractBound: false,
    modifiedProjectionIdentityBeforeBuild: false,
    semanticTypecheck: false,
    eslint: false,
    webpackProductionBuild: false,
    turbopackProductionBuild: false,
    controlledNextEnvMutation: false,
    modifiedProjectionIdentityAfterBuildRestore: false,
  },
  steps: [],
  truthBoundary: 'PASS proves exact source binding and native Windows semantic/lint/dual-build execution for the P61F font-hash transition plus acquisition contract. It does not itself prove Browser, PDF independent replay, customer value, rights beyond the captured OFL text, sale, GO, LIVE or WORLD_CLASS.',
};

try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest?.projection?.fileCount !== 1597) throw new Error(`projection_denominator_mismatch:${manifest?.projection?.fileCount}`);
  const baselineRenderer = fileIdentity(RENDERER_PATH);
  const baselinePolicy = fileIdentity(POLICY_PATH);
  const baselineNextEnv = fileIdentity(NEXT_ENV_PATH);
  assertIdentity(baselineRenderer, baseline.renderer, 'renderer-before-patch');
  assertIdentity(baselinePolicy, baseline.policy, 'policy-before-patch');
  assertIdentity(baselineNextEnv, baseline.nextEnv, 'next-env-before-patch');
  receipt.sourceDelta.before = { renderer: baselineRenderer, policy: baselinePolicy, nextEnv: baselineNextEnv };
  receipt.hardGates.exactP60BaselineBeforePatch = true;

  const rendererAbsolute = join(sourceRoot, ...RENDERER_PATH.split('/'));
  const policyAbsolute = join(sourceRoot, ...POLICY_PATH.split('/'));
  let renderer = readFileSync(rendererAbsolute, 'utf8');
  renderer = replaceExactlyOnce(renderer, OLD_FONT_SHA, NEW_FONT_SHA, 'renderer-font-sha');
  writeFileSync(rendererAbsolute, renderer, { encoding: 'utf8' });

  let policyText = readFileSync(policyAbsolute, 'utf8');
  policyText = replaceExactlyOnce(policyText, OLD_FONT_SHA, NEW_FONT_SHA, 'policy-font-sha');
  policyText = replaceExactlyOnce(policyText, OLD_REVISION, NEW_REVISION, 'policy-revision');
  writeFileSync(policyAbsolute, policyText, { encoding: 'utf8' });

  const acquisition = JSON.parse(readFileSync(acquisitionContractPath, 'utf8'));
  if (acquisition?.upstream?.fontSha256 !== NEW_FONT_SHA || acquisition?.upstream?.fontGitBlobSha1 !== 'cf7cea3879019206c6e084ac14ada8e2d3e4dd70' || acquisition?.upstream?.licenseId !== 'OFL-1.1') {
    throw new Error('acquisition_contract_identity_mismatch');
  }
  const acquisitionDestination = join(sourceRoot, ...ACQUISITION_PATH.split('/'));
  mkdirSync(dirname(acquisitionDestination), { recursive: true });
  writeFileSync(acquisitionDestination, readFileSync(acquisitionContractPath));

  const patchedRenderer = fileIdentity(RENDERER_PATH);
  const patchedPolicy = fileIdentity(POLICY_PATH);
  assertIdentity(patchedRenderer, patched.renderer, 'renderer-after-patch');
  assertIdentity(patchedPolicy, patched.policy, 'policy-after-patch');
  const acquisitionIdentity = fileIdentity(ACQUISITION_PATH);
  if (!acquisitionIdentity.exists || acquisitionIdentity.sha256 !== sha256File(acquisitionContractPath)) throw new Error('acquisition_contract_copy_mismatch');
  receipt.sourceDelta.after = { renderer: patchedRenderer, policy: patchedPolicy, acquisition: acquisitionIdentity };
  receipt.hardGates.deterministicSourcePatch = true;
  receipt.hardGates.acquisitionContractBound = true;

  const expectedOverrides = new Map([
    [RENDERER_PATH, { path: RENDERER_PATH, ...patched.renderer }],
    [POLICY_PATH, { path: POLICY_PATH, ...patched.policy }],
  ]);
  receipt.modifiedProjectionBeforeBuild = modifiedProjectionIdentity(manifest, expectedOverrides);
  receipt.hardGates.modifiedProjectionIdentityBeforeBuild = receipt.modifiedProjectionBeforeBuild.pass;
  if (!receipt.hardGates.modifiedProjectionIdentityBeforeBuild) throw new Error('modified_projection_identity_before_build_failed');

  const node = process.execPath;
  await runStep(receipt, 'typescript-semantic', node, [join(sourceRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '--pretty', 'false'], { timeoutMs: 20 * 60 * 1000 });
  receipt.hardGates.semanticTypecheck = true;
  await runStep(receipt, 'eslint', node, [join(sourceRoot, 'node_modules', 'eslint', 'bin', 'eslint.js'), 'app', 'components', 'lib', 'store', 'i18n.ts', 'navigation.ts', 'proxy.ts', 'routing.ts', 'tailwind.config.ts', 'next.config.mjs', '--ext', '.js,.mjs,.cjs,.ts,.tsx', '--max-warnings', '0'], { timeoutMs: 25 * 60 * 1000 });
  receipt.hardGates.eslint = true;

  const nextEnvBytes = readFileSync(join(sourceRoot, NEXT_ENV_PATH));
  for (const entry of readdirSync(sourceRoot)) if (entry === '.next' || entry.startsWith('.next-')) rmSync(join(sourceRoot, entry), { recursive: true, force: true });
  const buildEnv = { NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=6144', NEXT_TELEMETRY_DISABLED: '1' };
  const nextCli = join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  await runStep(receipt, 'next-webpack-production-build', node, [nextCli, 'build', '--webpack'], { timeoutMs: 50 * 60 * 1000, env: buildEnv });
  receipt.webpackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.webpackProductionBuild = receipt.webpackOutput.exists && receipt.webpackOutput.files > 0;
  if (!receipt.hardGates.webpackProductionBuild) throw new Error('webpack_output_missing');
  assertIdentity(fileIdentity(NEXT_ENV_PATH), patched.generatedNextEnv, 'next-env-after-webpack');
  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });

  await runStep(receipt, 'next-turbopack-production-build', node, [nextCli, 'build', '--turbopack'], { timeoutMs: 50 * 60 * 1000, env: buildEnv });
  receipt.turbopackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.turbopackProductionBuild = receipt.turbopackOutput.exists && receipt.turbopackOutput.files > 0;
  if (!receipt.hardGates.turbopackProductionBuild) throw new Error('turbopack_output_missing');
  assertIdentity(fileIdentity(NEXT_ENV_PATH), patched.generatedNextEnv, 'next-env-after-turbopack');

  writeFileSync(join(sourceRoot, NEXT_ENV_PATH), nextEnvBytes);
  assertIdentity(fileIdentity(NEXT_ENV_PATH), baseline.nextEnv, 'next-env-after-restore');
  receipt.hardGates.controlledNextEnvMutation = true;
  receipt.modifiedProjectionAfterBuildRestore = modifiedProjectionIdentity(manifest, expectedOverrides);
  receipt.hardGates.modifiedProjectionIdentityAfterBuildRestore = receipt.modifiedProjectionAfterBuildRestore.pass;
  if (!receipt.hardGates.modifiedProjectionIdentityAfterBuildRestore) throw new Error('modified_projection_identity_after_build_restore_failed');

  if (!Object.values(receipt.hardGates).every(Boolean)) throw new Error('one_or_more_hard_gates_false');
  receipt.status = 'PASS';
  receipt.decision = 'PASS_P61F_OFFICIAL_MANROPE_SOURCE_PATCH_SEMANTIC_LINT_DUAL_BUILD';
  writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));
  process.exitCode = 0;
} catch (error) {
  receipt.status = 'FAIL';
  receipt.decision = 'FAIL_CLOSED_P61F_OFFICIAL_MANROPE_SOURCE_ENGINEERING';
  receipt.error = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
  writeReceipt(receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exitCode = 1;
}
