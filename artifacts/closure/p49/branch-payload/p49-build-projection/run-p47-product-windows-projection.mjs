import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
function arg(name, fallback = null) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const sourceRoot = resolve(arg('--source-root', '.'));
const manifestPath = resolve(arg('--manifest'));
const outputRoot = resolve(arg('--output-dir', 'p47-out'));
const logsRoot = join(outputRoot, 'logs');
mkdirSync(logsRoot, { recursive: true });
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const receiptPath = join(outputRoot, 'P47_EXACT_WINDOWS_BUILD_RELEVANT_PROJECTION_RECEIPT.json');

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}
function stableSha(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(value, Object.keys(value).sort())));
}
function toPosix(path) {
  return path.split(sep).join('/');
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
function projectionIdentity() {
  const expectedPaths = new Set(manifest.files.map((row) => row.path));
  const actual = walkFiles(sourceRoot, new Set(['node_modules']));
  const actualPaths = new Set(actual.map((row) => row.path));
  const missing = [...expectedPaths].filter((path) => !actualPaths.has(path)).sort();
  const unexpected = [...actualPaths].filter((path) => !expectedPaths.has(path)).sort();
  const rows = [];
  let bytes = 0;
  const mismatches = [];
  for (const expected of manifest.files) {
    const absolute = join(sourceRoot, ...expected.path.split('/'));
    if (!existsSync(absolute)) continue;
    const size = statSync(absolute).size;
    const sha256 = sha256File(absolute);
    rows.push({ path: expected.path, byteLength: size, sha256 });
    bytes += size;
    if (size !== expected.byteLength || sha256 !== expected.sha256) {
      mismatches.push({ path: expected.path, expectedByteLength: expected.byteLength, actualByteLength: size, expectedSha256: expected.sha256, actualSha256: sha256 });
    }
  }
  const pathSetSha256 = sha256Bytes(Buffer.from(rows.map((row) => row.path).join('\n')));
  const aggregate = createHash('sha256');
  for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
  const sourceContentAggregateSha256 = aggregate.digest('hex');
  const expected = manifest.projection;
  const pass = missing.length === 0 && unexpected.length === 0 && mismatches.length === 0 && rows.length === expected.fileCount && bytes === expected.payloadBytes && pathSetSha256 === expected.pathSetSha256 && sourceContentAggregateSha256 === expected.sourceContentAggregateSha256;
  return { pass, fileCount: rows.length, payloadBytes: bytes, pathSetSha256, sourceContentAggregateSha256, missing, unexpected, mismatches };
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
function commandString(command, commandArgs) {
  return [command, ...commandArgs].map((part) => /\s/.test(part) ? JSON.stringify(part) : part).join(' ');
}
async function runStep(name, command, commandArgs, options = {}) {
  const logPath = join(logsRoot, `${String(receipt.steps.length + 1).padStart(2, '0')}-${name}.log`);
  const log = createWriteStream(logPath, { encoding: 'utf8' });
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const env = { ...process.env, CI: '1', NEXT_TELEMETRY_DISABLED: '1', NO_COLOR: '1', FORCE_COLOR: '0', ...options.env };
  const row = { name, command: commandString(command, commandArgs), cwd: options.cwd ?? sourceRoot, startedAt: new Date(started).toISOString(), pass: false };
  receipt.steps.push(row);
  await new Promise((resolvePromise) => {
    const child = spawn(command, commandArgs, { cwd: row.cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
    }, timeoutMs);
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('error', (error) => {
      clearTimeout(timer);
      row.error = `${error.name}: ${error.message}`;
      row.timedOut = timedOut;
      log.write(`\nSPAWN_ERROR ${row.error}\n`);
      log.end();
      resolvePromise();
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      row.exitCode = code;
      row.signal = signal;
      row.timedOut = timedOut;
      row.pass = code === 0 && !timedOut;
      log.write(`\nP47_STEP_END exitCode=${code} signal=${signal ?? ''} timedOut=${timedOut}\n`);
      log.end();
      resolvePromise();
    });
  });
  row.finishedAt = new Date().toISOString();
  row.durationSeconds = Math.round((Date.now() - started) / 100) / 10;
  row.log = relative(outputRoot, logPath).split(sep).join('/');
  row.logSha256 = sha256File(logPath);
  if (!row.pass) throw new Error(`Step failed: ${name}`);
  return row;
}
function persist(status, error = null) {
  receipt.status = status;
  receipt.error = error;
  receipt.finishedAt = new Date().toISOString();
  const integrityInput = { ...receipt };
  delete integrityInput.integritySha256;
  receipt.integritySha256 = sha256Bytes(Buffer.from(JSON.stringify(integrityInput)));
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

const receipt = {
  schemaVersion: 'velmere.p47.exact-windows-build-relevant-projection-receipt.v1',
  status: 'IN_PROGRESS',
  classification: 'CURRENT_SOURCE_EXACT_BUILD_RELEVANT_PROJECTION_NOT_FULL_SOURCE',
  startedAt: new Date().toISOString(),
  fullP46SourceBinding: manifest.fullP46SourceBinding,
  projectionManifest: { path: manifestPath, sha256: sha256File(manifestPath) },
  truthBoundary: manifest.truthBoundary,
  platform: { platform: process.platform, arch: process.arch, osRelease: os.release(), osVersion: os.version(), hostname: os.hostname() },
  toolchain: {},
  hardGates: {
    nativeWindows: false,
    exactNode: false,
    exactNpm: false,
    exactProjectionPreInstall: false,
    dependencyClosure: false,
    nativeNextSwc: false,
    typecheck: false,
    lint: false,
    webpackProductionBuild: false,
    turbopackProductionBuild: false,
    exactProjectionPostBuild: false,
  },
  steps: [],
  excludedCredit: manifest.projection.excludedFromCredit,
};

try {
  receipt.hardGates.nativeWindows = process.platform === 'win32';
  const nodeVersion = process.version;
  const npmCli = process.env.P47_NPM_CLI_PATH;
  if (!npmCli || !existsSync(npmCli)) throw new Error(`P47_NPM_CLI_PATH missing or invalid: ${npmCli ?? 'unset'}`);
  const npmVersionProbe = spawnSync(process.execPath, [npmCli, '--version'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true });
  const npmVersion = (npmVersionProbe.stdout || '').trim();
  receipt.toolchain = { node: nodeVersion, npm: npmVersion, npmCli, nodeExecutable: process.execPath };
  receipt.hardGates.exactNode = nodeVersion === 'v24.18.0';
  receipt.hardGates.exactNpm = npmVersion === '11.16.0';
  if (!receipt.hardGates.nativeWindows || !receipt.hardGates.exactNode || !receipt.hardGates.exactNpm) throw new Error(`Exact Windows/Node/npm gate failed: ${JSON.stringify(receipt.toolchain)} platform=${process.platform}`);

  receipt.projectionPreInstall = projectionIdentity();
  receipt.hardGates.exactProjectionPreInstall = receipt.projectionPreInstall.pass;
  if (!receipt.projectionPreInstall.pass) throw new Error('Exact projection pre-install identity mismatch');
  receipt.lockfileBefore = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };

  await runStep('npm-ci-ignore-scripts', process.execPath, [npmCli, 'ci', '--ignore-scripts', '--include=dev', '--audit=false', '--fund=false'], { timeoutMs: 35 * 60 * 1000 });
  await runStep('npm-ls-all', process.execPath, [npmCli, 'ls', '--all'], { timeoutMs: 10 * 60 * 1000 });
  receipt.hardGates.dependencyClosure = true;

  const probes = [];
  for (const packageName of ['next/package.json', 'react/package.json', 'react-dom/package.json', 'typescript/package.json', 'eslint/package.json', '@next/swc-win32-x64-msvc/package.json']) {
    try {
      const resolved = require.resolve(packageName, { paths: [sourceRoot] });
      const packageJson = JSON.parse(readFileSync(resolved, 'utf8'));
      probes.push({ packageName, pass: true, resolved, version: packageJson.version });
    } catch (error) {
      probes.push({ packageName, pass: false, error: `${error.name}: ${error.message}` });
    }
  }
  try {
    const swc = require(require.resolve('@next/swc-win32-x64-msvc', { paths: [sourceRoot] }));
    probes.push({ packageName: '@next/swc-win32-x64-msvc runtime', pass: Boolean(swc), exports: Object.keys(swc).slice(0, 25) });
  } catch (error) {
    probes.push({ packageName: '@next/swc-win32-x64-msvc runtime', pass: false, error: `${error.name}: ${error.message}` });
  }
  receipt.nativePackageProbes = probes;
  receipt.hardGates.nativeNextSwc = probes.every((row) => row.pass);
  writeFileSync(join(outputRoot, 'P47_NATIVE_PACKAGE_PROBES.json'), `${JSON.stringify(probes, null, 2)}\n`);
  if (!receipt.hardGates.nativeNextSwc) throw new Error('Native package probe failed');

  await runStep('typescript-semantic', process.execPath, [join(sourceRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '--pretty', 'false'], { timeoutMs: 20 * 60 * 1000 });
  receipt.hardGates.typecheck = true;

  await runStep('eslint', process.execPath, [join(sourceRoot, 'node_modules', 'eslint', 'bin', 'eslint.js'), 'app', 'components', 'lib', 'store', 'i18n.ts', 'navigation.ts', 'proxy.ts', 'routing.ts', 'tailwind.config.ts', 'next.config.mjs', '--ext', '.js,.mjs,.cjs,.ts,.tsx', '--max-warnings', '0'], { timeoutMs: 25 * 60 * 1000 });
  receipt.hardGates.lint = true;

  for (const entry of readdirSync(sourceRoot)) if (entry === '.next' || entry.startsWith('.next-')) rmSync(join(sourceRoot, entry), { recursive: true, force: true });
  const buildEnv = { NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=6144' };
  await runStep('next-webpack-production-build', process.execPath, [join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--webpack'], { timeoutMs: 50 * 60 * 1000, env: buildEnv });
  receipt.webpackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.webpackProductionBuild = receipt.webpackOutput.exists && receipt.webpackOutput.files > 0;
  if (!receipt.hardGates.webpackProductionBuild) throw new Error('Webpack build produced no .next output');
  rmSync(join(sourceRoot, '.next'), { recursive: true, force: true });

  await runStep('next-turbopack-production-build', process.execPath, [join(sourceRoot, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build', '--turbopack'], { timeoutMs: 50 * 60 * 1000, env: buildEnv });
  receipt.turbopackOutput = treeFingerprint(join(sourceRoot, '.next'));
  receipt.hardGates.turbopackProductionBuild = receipt.turbopackOutput.exists && receipt.turbopackOutput.files > 0;
  if (!receipt.hardGates.turbopackProductionBuild) throw new Error('Turbopack build produced no .next output');

  receipt.projectionPostBuild = projectionIdentity();
  receipt.hardGates.exactProjectionPostBuild = receipt.projectionPostBuild.pass;
  receipt.lockfileAfter = { sha256: sha256File(join(sourceRoot, 'package-lock.json')), packageJsonSha256: sha256File(join(sourceRoot, 'package.json')) };
  receipt.lockfileUnchanged = receipt.lockfileBefore.sha256 === receipt.lockfileAfter.sha256 && receipt.lockfileBefore.packageJsonSha256 === receipt.lockfileAfter.packageJsonSha256;
  if (!receipt.hardGates.exactProjectionPostBuild || !receipt.lockfileUnchanged) throw new Error('Projection or lockfile changed during native-Windows execution');

  receipt.decision = 'PASS_NATIVE_WINDOWS_EXACT_BUILD_RELEVANT_PROJECTION_SEMANTIC_LINT_DUAL_BUILD';
  receipt.credit = {
    nativeWindowsBuildRelevantProjection: 'PASS',
    fullExactWindowsSource: 'WITHHELD_NOT_EXECUTED',
    browserDistinctSkus: '0/3',
    pdfIndependentReplay: '0/1',
    physicalCustomerOutputs: '0/17',
    materialRequiredDeltas: '0/6',
    fieldRights: '0/176',
    saleEligible: '0/17',
  };
  persist('PASS');
} catch (error) {
  receipt.decision = 'FAIL_CLOSED_NATIVE_WINDOWS_BUILD_RELEVANT_PROJECTION';
  receipt.credit = {
    nativeWindowsBuildRelevantProjection: 'WITHHELD',
    fullExactWindowsSource: 'WITHHELD_NOT_EXECUTED',
    browserDistinctSkus: '0/3',
    pdfIndependentReplay: '0/1',
    physicalCustomerOutputs: '0/17',
    materialRequiredDeltas: '0/6',
    fieldRights: '0/176',
    saleEligible: '0/17',
  };
  persist('FAIL', `${error.name}: ${error.message}`);
  console.error(error);
  process.exitCode = 1;
}
