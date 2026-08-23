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

const argv = process.argv.slice(2);
function arg(name) {
  const index = argv.indexOf(name);
  if (index < 0 || index + 1 >= argv.length) throw new Error(`missing_argument:${name}`);
  return argv[index + 1];
}

const sourceRoot = resolve(arg('--source-root'));
const manifestPath = resolve(arg('--projection-manifest'));
const acquisitionContractPath = resolve(arg('--acquisition-contract'));
const sourcePatchPath = resolve(arg('--source-patch'));
const outputRoot = resolve(arg('--output-dir'));
const receiptPath = join(outputRoot, 'P61G_OFFICIAL_MANROPE_RENDERER_SOURCE_ENGINEERING_RECEIPT.json');
const logsRoot = join(outputRoot, 'logs');
mkdirSync(logsRoot, { recursive: true });

const RENDERER_PATH = 'lib/search/lens-pdf-renderer.ts';
const NEXT_ENV_PATH = 'next-env.d.ts';
const PACKAGE_JSON_PATH = 'package.json';
const PACKAGE_LOCK_PATH = 'package-lock.json';
const OLD_FONT_SHA = 'a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa';
const NEW_FONT_SHA = '67d5c238a5058f56a361c7fea054cf3be26d602bd03b418a09bff73a25a17250';
const OFFICIAL_FONT_BLOB_SHA1 = 'cf7cea3879019206c6e084ac14ada8e2d3e4dd70';
const OFFICIAL_LICENSE_BLOB_SHA1 = '472064afc4b8dec9079fab03b8ffafb617a1b2d8';

const BASELINE_RENDERER = Object.freeze({
  byteLength: 76847,
  sha256: '1e18d849d232e48cf12b40f5b274141f21353b2d7038d40d3f69103ed71380d3',
});
const PATCHED_RENDERER = Object.freeze({
  byteLength: 76847,
  sha256: '18142581dc6f858df800c684c90bb6c444683758664f45f5eb7b87932f0bd647',
});
const BASELINE_NEXT_ENV = Object.freeze({
  byteLength: 262,
  sha256: 'e02cf94f68fe440954d3213106a7e943e5424cc867d7cd3ab406dc31263e6767',
});
const GENERATED_NEXT_ENV = Object.freeze({
  byteLength: 247,
  sha256: '7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651',
});

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function sha256File(filePath) {
  return sha256Bytes(readFileSync(filePath));
}
function canonicalJson(value, seen = new WeakSet()) {
  if (typeof value === 'undefined') return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) throw new Error('canonical_json_cycle');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, seen)).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`).join(',')}}`;
  } finally {
    seen.delete(value);
  }
}
function stableSha(value) {
  return sha256Bytes(Buffer.from(canonicalJson(value), 'utf8'));
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
function walkProductFiles(root) {
  const rows = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      const rel = toPosix(relative(root, absolute));
      const top = rel.split('/')[0];
      if (top === 'node_modules' || top.startsWith('.next')) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) rows.push({ path: rel, absolute });
    }
  };
  visit(root);
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}
function projectionIdentity(manifest, overrides = new Map()) {
  const expectedRows = manifest.files
    .map((row) => overrides.get(row.path) ?? row)
    .slice()
    .sort((left, right) => left.path.localeCompare(right.path));
  const actualFiles = walkProductFiles(sourceRoot);
  const actualMap = new Map(actualFiles.map((row) => [row.path, row]));
  const expectedPaths = new Set(expectedRows.map((row) => row.path));
  const actualPaths = new Set(actualFiles.map((row) => row.path));
  const missing = [...expectedPaths].filter((value) => !actualPaths.has(value)).sort();
  const unexpected = [...actualPaths].filter((value) => !expectedPaths.has(value)).sort();
  const rows = [];
  const mismatches = [];
  let payloadBytes = 0;
  for (const expected of expectedRows) {
    const actual = actualMap.get(expected.path);
    if (!actual) continue;
    const observed = {
      path: expected.path,
      byteLength: statSync(actual.absolute).size,
      sha256: sha256File(actual.absolute),
    };
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
  rows.sort((left, right) => left.path.localeCompare(right.path));
  const pathSetSha256 = sha256Bytes(Buffer.from(rows.map((row) => row.path).join('\n'), 'utf8'));
  const aggregate = createHash('sha256');
  for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
  const sourceContentAggregateSha256 = aggregate.digest('hex');
  return {
    pass: missing.length === 0 && unexpected.length === 0 && mismatches.length === 0 && rows.length === expectedRows.length,
    fileCount: rows.length,
    payloadBytes,
    pathSetSha256,
    sourceContentAggregateSha256,
    missing,
    unexpected,
    mismatches,
  };
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
  rows.sort((left, right) => left.path.localeCompare(right.path));
  const digest = createHash('sha256');
  let bytes = 0;
  for (const row of rows) {
    const byteLength = statSync(row.absolute).size;
    const sha256 = sha256File(row.absolute);
    bytes += byteLength;
    digest.update(`${row.path}\0${byteLength}\0${sha256}\n`);
  }
  return { exists: true, files: rows.length, bytes, sha256: digest.digest('hex') };
}
async function runStep(receipt, name, command, commandArgs, options = {}) {
  const logPath = join(logsRoot, `${String(receipt.steps.length + 1).padStart(2, '0')}-${name}.log`);
  const log = createWriteStream(logPath, { encoding: 'utf8' });
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...(options.env ?? {}) };
  const child = spawn(command, commandArgs, {
    cwd: options.cwd ?? sourceRoot,
    env,
    windowsHide: true,
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000).unref();
  }, timeoutMs);
  const exitCode = await new Promise((resolveExit, rejectExit) => {
    child.once('error', rejectExit);
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
    durationMs: Date.now() - startedAt,
    log: toPosix(relative(outputRoot, logPath)),
    logSha256: sha256File(logPath),
  };
  receipt.steps.push(row);
  if (timedOut || exitCode !== 0) throw new Error(`step_failed:${name}:exit=${exitCode}:timeout=${timedOut}`);
}
function writeReceipt(receipt) {
  const core = structuredClone(receipt);
  delete core.integritySha256;
  receipt.integritySha256 = stableSha(core);
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' });
}

const receipt = {
  schemaVersion: 'velmere.p61g.official-manrope-renderer-source-engineering.v1',
  status: 'IN_PROGRESS',
  decision: 'IN_PROGRESS',
  sourceRoot,
  projectionManifest: {
    path: manifestPath,
    byteLength: statSync(manifestPath).size,
    sha256: sha256File(manifestPath),
  },
  acquisitionContract: {
    path: acquisitionContractPath,
    byteLength: statSync(acquisitionContractPath).size,
    sha256: sha256File(acquisitionContractPath),
  },
  sourcePatch: {
    path: sourcePatchPath,
    byteLength: statSync(sourcePatchPath).size,
    sha256: sha256File(sourcePatchPath),
  },
  hardGates: {
    exactP60ProjectionBeforePatch: false,
    exactRendererBaseline: false,
    acquisitionContractBound: false,
    rendererOnlyPatchControlBound: false,
    deterministicRendererPatch: false,
    modifiedProjectionBeforeBuild: false,
    semanticTypecheck: false,
    eslint: false,
    webpackProductionBuild: false,
    webpackControlledNextEnvMutation: false,
    turbopackProductionBuild: false,
    turbopackControlledNextEnvMutation: false,
    modifiedProjectionAfterBuildRestore: false,
    packageInputsUnchanged: false,
  },
  steps: [],
  truthBoundary: 'PASS proves a one-existing-file, same-length renderer hash transition on the exact P60-bound 1597-file projection and a native Windows semantic, lint, Webpack and Turbopack campaign. The official font bytes remain an external runtime dependency and are not placed in source, materials or evidence. Browser, independent PDF replay, customer value, production rate-limit, sale, GO, LIVE and WORLD_CLASS remain separate.',
};

let baselineNextEnvBytes = null;
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest?.projection?.fileCount !== 1597) throw new Error(`projection_denominator_mismatch:${manifest?.projection?.fileCount}`);
  if (manifest?.projection?.payloadBytes !== 20952834) throw new Error(`projection_payload_mismatch:${manifest?.projection?.payloadBytes}`);

  receipt.baselineProjection = projectionIdentity(manifest);
  receipt.hardGates.exactP60ProjectionBeforePatch = (
    receipt.baselineProjection.pass
    && receipt.baselineProjection.fileCount === manifest.projection.fileCount
    && receipt.baselineProjection.payloadBytes === manifest.projection.payloadBytes
    && receipt.baselineProjection.pathSetSha256 === manifest.projection.pathSetSha256
    && receipt.baselineProjection.sourceContentAggregateSha256 === manifest.projection.sourceContentAggregateSha256
  );
  if (!receipt.hardGates.exactP60ProjectionBeforePatch) throw new Error('exact_p60_projection_before_patch_failed');

  const rendererBefore = fileIdentity(RENDERER_PATH);
  assertIdentity(rendererBefore, BASELINE_RENDERER, 'renderer-before-patch');
  receipt.hardGates.exactRendererBaseline = true;

  const nextEnvBefore = fileIdentity(NEXT_ENV_PATH);
  assertIdentity(nextEnvBefore, BASELINE_NEXT_ENV, 'next-env-before-build');
  baselineNextEnvBytes = readFileSync(join(sourceRoot, NEXT_ENV_PATH));

  const acquisition = JSON.parse(readFileSync(acquisitionContractPath, 'utf8'));
  if (
    acquisition?.upstream?.fontGitBlobSha1 !== OFFICIAL_FONT_BLOB_SHA1
    || acquisition?.upstream?.fontByteLength !== 134800
    || acquisition?.upstream?.fontSha256 !== NEW_FONT_SHA
    || acquisition?.upstream?.licenseGitBlobSha1 !== OFFICIAL_LICENSE_BLOB_SHA1
    || acquisition?.upstream?.licenseId !== 'OFL-1.1'
    || acquisition?.projectionMutation?.path !== RENDERER_PATH
    || acquisition?.projectionMutation?.baselineSha256 !== BASELINE_RENDERER.sha256
    || acquisition?.projectionMutation?.patchedSha256 !== PATCHED_RENDERER.sha256
    || acquisition?.projectionMutation?.externalPolicyFileMutation !== false
    || acquisition?.integrity?.fontBytesIncludedInSource !== false
    || acquisition?.integrity?.fontBytesUploadedAsEvidence !== false
  ) {
    throw new Error('acquisition_contract_identity_mismatch');
  }
  receipt.hardGates.acquisitionContractBound = true;

  const patchText = readFileSync(sourcePatchPath, 'utf8');
  if (
    !patchText.includes(`--- a/${RENDERER_PATH}`)
    || !patchText.includes(`+++ b/${RENDERER_PATH}`)
    || !patchText.includes(`-${'  "'}${OLD_FONT_SHA}${'";'}`)
    || !patchText.includes(`+${'  "'}${NEW_FONT_SHA}${'";'}`)
    || patchText.includes('r44p44-font-asset-boundary.json')
  ) {
    throw new Error('renderer_only_patch_control_mismatch');
  }
  receipt.hardGates.rendererOnlyPatchControlBound = true;

  const rendererAbsolute = join(sourceRoot, ...RENDERER_PATH.split('/'));
  const rendererText = readFileSync(rendererAbsolute, 'utf8');
  const patchedText = replaceExactlyOnce(rendererText, OLD_FONT_SHA, NEW_FONT_SHA, 'renderer-runtime-font-sha');
  writeFileSync(rendererAbsolute, patchedText, { encoding: 'utf8' });
  const rendererAfter = fileIdentity(RENDERER_PATH);
  assertIdentity(rendererAfter, PATCHED_RENDERER, 'renderer-after-patch');
  receipt.sourceDelta = { before: rendererBefore, after: rendererAfter };
  receipt.hardGates.deterministicRendererPatch = true;

  const overrides = new Map([[RENDERER_PATH, { path: RENDERER_PATH, ...PATCHED_RENDERER }]]);
  receipt.modifiedProjectionBeforeBuild = projectionIdentity(manifest, overrides);
  receipt.hardGates.modifiedProjectionBeforeBuild = (
    receipt.modifiedProjectionBeforeBuild.pass
    && receipt.modifiedProjectionBeforeBuild.fileCount === 1597
    && receipt.modifiedProjectionBeforeBuild.payloadBytes === 20952834
    && receipt.modifiedProjectionBeforeBuild.pathSetSha256 === manifest.projection.pathSetSha256
  );
  if (!receipt.hardGates.modifiedProjectionBeforeBuild) throw new Error('modified_projection_before_build_failed');

  const packageJsonBefore = fileIdentity(PACKAGE_JSON_PATH);
  const packageLockBefore = fileIdentity(PACKAGE_LOCK_PATH);
  receipt.packageInputs = { before: { packageJson: packageJsonBefore, packageLock: packageLockBefore } };

  const node = process.execPath;
  const typescriptCli = join(sourceRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  const eslintCli = join(sourceRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');
  const nextCli = join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  for (const required of [typescriptCli, eslintCli, nextCli]) {
    if (!existsSync(required)) throw new Error(`required_cli_missing:${required}`);
  }

  await runStep(receipt, 'typescript-semantic', node, [typescriptCli, '--noEmit', '--pretty', 'false'], { timeoutMs: 20 * 60 * 1000 });
  receipt.hardGates.semanticTypecheck = true;

  await runStep(receipt, 'eslint', node, [
    eslintCli,
    'app',
    'components',
    'lib',
    'store',
    'i18n.ts',
    'navigation.ts',
    'proxy.ts',
    'routing.ts',
    'tailwind.config.ts',
    'next.config.mjs',
    '--ext',
    '.js,.mjs,.cjs,.ts,.tsx',
    '--max-warnings',
    '0',
  ], { timeoutMs: 25 * 60 * 1000 });
  receipt.hardGates.eslint = true;

  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });
  await runStep(receipt, 'next-webpack-production-build', node, [nextCli, 'build', '--webpack'], {
    timeoutMs: 45 * 60 * 1000,
    env: { NODE_ENV: 'production' },
  });
  receipt.webpackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.webpackProductionBuild = receipt.webpackOutput.exists && receipt.webpackOutput.files > 0;
  if (!receipt.hardGates.webpackProductionBuild) throw new Error('webpack_build_output_missing');
  const nextEnvAfterWebpack = fileIdentity(NEXT_ENV_PATH);
  assertIdentity(nextEnvAfterWebpack, GENERATED_NEXT_ENV, 'next-env-after-webpack');
  receipt.hardGates.webpackControlledNextEnvMutation = true;
  writeFileSync(join(sourceRoot, NEXT_ENV_PATH), baselineNextEnvBytes);
  assertIdentity(fileIdentity(NEXT_ENV_PATH), BASELINE_NEXT_ENV, 'next-env-restored-after-webpack');

  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });
  await runStep(receipt, 'next-turbopack-production-build', node, [nextCli, 'build', '--turbopack'], {
    timeoutMs: 45 * 60 * 1000,
    env: { NODE_ENV: 'production' },
  });
  receipt.turbopackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.turbopackProductionBuild = receipt.turbopackOutput.exists && receipt.turbopackOutput.files > 0;
  if (!receipt.hardGates.turbopackProductionBuild) throw new Error('turbopack_build_output_missing');
  const nextEnvAfterTurbopack = fileIdentity(NEXT_ENV_PATH);
  assertIdentity(nextEnvAfterTurbopack, GENERATED_NEXT_ENV, 'next-env-after-turbopack');
  receipt.hardGates.turbopackControlledNextEnvMutation = true;
  writeFileSync(join(sourceRoot, NEXT_ENV_PATH), baselineNextEnvBytes);
  assertIdentity(fileIdentity(NEXT_ENV_PATH), BASELINE_NEXT_ENV, 'next-env-restored-after-turbopack');

  receipt.modifiedProjectionAfterBuildRestore = projectionIdentity(manifest, overrides);
  receipt.hardGates.modifiedProjectionAfterBuildRestore = (
    receipt.modifiedProjectionAfterBuildRestore.pass
    && receipt.modifiedProjectionAfterBuildRestore.fileCount === receipt.modifiedProjectionBeforeBuild.fileCount
    && receipt.modifiedProjectionAfterBuildRestore.payloadBytes === receipt.modifiedProjectionBeforeBuild.payloadBytes
    && receipt.modifiedProjectionAfterBuildRestore.pathSetSha256 === receipt.modifiedProjectionBeforeBuild.pathSetSha256
    && receipt.modifiedProjectionAfterBuildRestore.sourceContentAggregateSha256 === receipt.modifiedProjectionBeforeBuild.sourceContentAggregateSha256
  );
  if (!receipt.hardGates.modifiedProjectionAfterBuildRestore) throw new Error('modified_projection_after_build_restore_failed');

  const packageJsonAfter = fileIdentity(PACKAGE_JSON_PATH);
  const packageLockAfter = fileIdentity(PACKAGE_LOCK_PATH);
  receipt.packageInputs.after = { packageJson: packageJsonAfter, packageLock: packageLockAfter };
  receipt.hardGates.packageInputsUnchanged = (
    packageJsonBefore.byteLength === packageJsonAfter.byteLength
    && packageJsonBefore.sha256 === packageJsonAfter.sha256
    && packageLockBefore.byteLength === packageLockAfter.byteLength
    && packageLockBefore.sha256 === packageLockAfter.sha256
  );
  if (!receipt.hardGates.packageInputsUnchanged) throw new Error('package_inputs_changed');

  const failedGates = Object.entries(receipt.hardGates).filter(([, value]) => value !== true).map(([name]) => name);
  if (failedGates.length > 0) throw new Error(`hard_gates_not_closed:${failedGates.join(',')}`);
  receipt.status = 'PASS';
  receipt.decision = 'PASS_P61G_OFFICIAL_MANROPE_RENDERER_ONLY_NATIVE_WINDOWS_SEMANTIC_LINT_DUAL_BUILD';
  receipt.hardGateSummary = { passed: Object.keys(receipt.hardGates).length, total: Object.keys(receipt.hardGates).length };
  writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
} catch (error) {
  if (baselineNextEnvBytes && existsSync(join(sourceRoot, NEXT_ENV_PATH))) {
    try { writeFileSync(join(sourceRoot, NEXT_ENV_PATH), baselineNextEnvBytes); } catch {}
  }
  receipt.status = 'FAIL';
  receipt.decision = 'FAIL_CLOSED_P61G_OFFICIAL_MANROPE_RENDERER_SOURCE_ENGINEERING';
  receipt.error = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
  receipt.hardGateSummary = {
    passed: Object.values(receipt.hardGates).filter((value) => value === true).length,
    total: Object.keys(receipt.hardGates).length,
  };
  writeReceipt(receipt);
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}
