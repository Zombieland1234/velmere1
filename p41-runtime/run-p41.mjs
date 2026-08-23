import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const payloadDir = path.join(repoRoot, 'p41-runtime');
const outDir = path.join(repoRoot, 'p41-out');
const projectDir = path.join(outDir, 'project');
const casDir = path.join(outDir, 'cas');
const logsDir = path.join(outDir, 'logs');
const npmCacheDir = path.join(outDir, 'npm-cache');
for (const dir of [outDir, projectDir, casDir, logsDir, npmCacheDir]) fs.mkdirSync(dir, { recursive: true });

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function run(command, args, options = {}) {
  const startedAt = now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 128,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  const endedAt = now();
  const record = {
    command: [command, ...args],
    cwd: options.cwd ?? repoRoot,
    startedAt,
    endedAt,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
  if (options.logFile) writeJson(options.logFile, record);
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed with ${result.status}: ${(result.stderr || result.stdout || '').slice(-4000)}`);
  }
  return record;
}

function decodePayload() {
  const parts = fs.readdirSync(payloadDir)
    .filter((name) => /^payload\.part-\d+$/.test(name))
    .sort();
  if (parts.length === 0) throw new Error('No payload parts found');
  const b64 = parts.map((name) => fs.readFileSync(path.join(payloadDir, name), 'utf8')).join('').trim();
  const compressed = Buffer.from(b64, 'base64');
  const expectedCompressedSha = '146d08dac1402bd8e344ec56047868adc018e16535000bc6354c19a4fc88453a';
  if (sha256(compressed) !== expectedCompressedSha) {
    throw new Error(`Compressed payload SHA mismatch: ${sha256(compressed)}`);
  }
  const payload = JSON.parse(zlib.brotliDecompressSync(compressed).toString('utf8'));
  const lockBytes = Buffer.from(payload.packageLock, 'utf8');
  const packageBytes = Buffer.from(payload.packageJson, 'utf8');
  const expectedLockSha = 'e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb';
  const expectedPackageSha = '04aa4b393337fffa6e02ef54ad7668fe8136b038b0d924b208158a095b6f70a5';
  if (sha256(lockBytes) !== expectedLockSha) throw new Error(`package-lock SHA mismatch: ${sha256(lockBytes)}`);
  if (sha256(packageBytes) !== expectedPackageSha) throw new Error(`package.json SHA mismatch: ${sha256(packageBytes)}`);
  fs.writeFileSync(path.join(projectDir, 'package-lock.json'), lockBytes);
  fs.writeFileSync(path.join(projectDir, 'package.json'), packageBytes);
  return {
    parts,
    compressedBytes: compressed.length,
    compressedSha256: sha256(compressed),
    packageLockSha256: sha256(lockBytes),
    packageJsonSha256: sha256(packageBytes),
  };
}

function selectSriToken(integrity) {
  const supported = ['sha512', 'sha384', 'sha256', 'sha1'];
  const tokens = String(integrity || '').split(/\s+/).filter(Boolean);
  for (const algorithm of supported) {
    const token = tokens.find((candidate) => candidate.startsWith(`${algorithm}-`));
    if (token) return { algorithm, expected: token.slice(algorithm.length + 1), token };
  }
  throw new Error(`Unsupported or missing integrity: ${integrity}`);
}

function deriveTarballs(lock) {
  const grouped = new Map();
  let lockPathsWithTarball = 0;
  for (const [lockPath, entry] of Object.entries(lock.packages || {})) {
    if (!lockPath || !entry || typeof entry !== 'object') continue;
    if (!entry.resolved || !entry.integrity) continue;
    lockPathsWithTarball += 1;
    const key = `${entry.resolved}\n${entry.integrity}`;
    const row = grouped.get(key) || {
      resolved: entry.resolved,
      integrity: entry.integrity,
      lockPaths: [],
    };
    row.lockPaths.push(lockPath);
    grouped.set(key, row);
  }
  const rows = [...grouped.values()];
  for (const row of rows) row.lockPaths.sort();
  rows.sort((a, b) => a.resolved.localeCompare(b.resolved) || a.integrity.localeCompare(b.integrity));
  return { rows, lockPathsWithTarball };
}

async function fetchWithRetry(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'velmere-p41-dependency-closure/1.0' },
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt * attempt));
    }
  }
  throw new Error(`Download failed after ${attempts} attempts for ${url}: ${lastError}`);
}

function verifySri(bytes, integrity) {
  const { algorithm, expected, token } = selectSriToken(integrity);
  const actual = crypto.createHash(algorithm).update(bytes).digest('base64');
  if (actual !== expected) throw new Error(`SRI mismatch for ${token}; actual ${algorithm}-${actual}`);
  return token;
}

async function downloadCas(rows) {
  const manifestRows = new Array(rows.length);
  const failures = [];
  let cursor = 0;
  const workerCount = Math.min(16, rows.length);
  async function worker(workerId) {
    while (true) {
      const index = cursor++;
      if (index >= rows.length) return;
      const row = rows[index];
      try {
        const bytes = await fetchWithRetry(row.resolved);
        const verifiedIntegrity = verifySri(bytes, row.integrity);
        const digest = sha256(bytes);
        const fileName = `${digest}.tgz`;
        const filePath = path.join(casDir, fileName);
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, bytes);
        manifestRows[index] = {
          resolved: row.resolved,
          integrity: row.integrity,
          verifiedIntegrity,
          lockPaths: row.lockPaths,
          byteLength: bytes.length,
          sha256: digest,
          casFile: `cas/${fileName}`,
          workerId,
        };
        if ((index + 1) % 25 === 0 || index + 1 === rows.length) {
          console.log(`[CAS] ${index + 1}/${rows.length}`);
        }
      } catch (error) {
        failures.push({ index, resolved: row.resolved, integrity: row.integrity, error: String(error?.stack || error) });
      }
    }
  }
  await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i + 1)));
  return { manifestRows: manifestRows.filter(Boolean), failures };
}

const startedAt = now();
const payloadReceipt = decodePayload();
const nodeVersion = process.version;
const npmVersion = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
const platform = process.platform;
const arch = process.arch;

if (nodeVersion !== 'v24.18.0') throw new Error(`Exact Node mismatch: ${nodeVersion}`);
if (npmVersion !== '11.16.0') throw new Error(`Exact npm mismatch: ${npmVersion}`);
if (platform !== 'win32' || arch !== 'x64') throw new Error(`Exact Windows x64 mismatch: ${platform}/${arch}`);

const lock = JSON.parse(fs.readFileSync(path.join(projectDir, 'package-lock.json'), 'utf8'));
const { rows, lockPathsWithTarball } = deriveTarballs(lock);
writeJson(path.join(outDir, 'derived-dependency-list.json'), {
  schema: 'velmere.p41.derived-dependency-list.v1',
  generatedAt: now(),
  packageLockSha256: payloadReceipt.packageLockSha256,
  lockPathsWithTarball,
  uniqueTarballs: rows.length,
  rows,
});

const onlineCi = run('npm', [
  'ci', '--ignore-scripts', '--audit=false', '--fund=false', '--prefer-online',
  '--cache', npmCacheDir, '--loglevel=notice',
], { cwd: projectDir, logFile: path.join(logsDir, 'npm-ci-online.json') });

const installedPackageCount = Object.keys(JSON.parse(execFileSync(process.execPath, ['-e', `const fs=require('fs'); const p='${path.join(projectDir, 'node_modules', '.package-lock.json').replace(/\\/g, '\\\\')}'; process.stdout.write(fs.readFileSync(p,'utf8'))`], { encoding: 'utf8' })).packages || {}).length;

fs.rmSync(path.join(projectDir, 'node_modules'), { recursive: true, force: true });
const offlineCi = run('npm', [
  'ci', '--offline', '--ignore-scripts', '--audit=false', '--fund=false',
  '--cache', npmCacheDir, '--loglevel=notice',
], { cwd: projectDir, logFile: path.join(logsDir, 'npm-ci-offline.json') });

const { manifestRows, failures } = await downloadCas(rows);
const coveredLockPaths = manifestRows.reduce((sum, row) => sum + row.lockPaths.length, 0);
const manifestCore = {
  schema: 'velmere.p41.windows-node24-dependency-cas.v1',
  generatedAt: now(),
  sourceBinding: {
    parentRoot: 'R44P46',
    checkpoint: 'P41',
    ownerDirective: 'V16',
    packageJsonSha256: payloadReceipt.packageJsonSha256,
    packageLockSha256: payloadReceipt.packageLockSha256,
  },
  runtime: { nodeVersion, npmVersion, platform, arch, runner: process.env.RUNNER_NAME || null, image: process.env.ImageOS || null },
  denominator: {
    lockPathsWithTarball,
    uniqueTarballs: rows.length,
    downloadedUniqueTarballs: manifestRows.length,
    coveredLockPaths,
    failedUniqueTarballs: failures.length,
  },
  rows: manifestRows,
  failures,
};
const canonicalManifestBytes = Buffer.from(JSON.stringify(manifestCore));
const manifest = { ...manifestCore, manifestCoreSha256: sha256(canonicalManifestBytes) };
writeJson(path.join(outDir, 'dependency-cas-manifest.json'), manifest);

const casFileNames = fs.readdirSync(casDir).sort();
const casAggregate = crypto.createHash('sha256');
for (const fileName of casFileNames) {
  const bytes = fs.readFileSync(path.join(casDir, fileName));
  casAggregate.update(Buffer.from(fileName + '\0', 'utf8'));
  casAggregate.update(bytes);
}
const endedAt = now();
const pass = failures.length === 0 && manifestRows.length === rows.length && coveredLockPaths === lockPathsWithTarball;
const receipt = {
  schema: 'velmere.p41.exact-windows-node24-dependency-closure.v1',
  startedAt,
  endedAt,
  status: pass ? 'PASS' : 'FAIL',
  authority: { parentRoot: 'R44P46', directive: 'V16', checkpoint: 'P41' },
  payloadReceipt,
  runtime: { nodeVersion, npmVersion, platform, arch, runner: process.env.RUNNER_NAME || null, image: process.env.ImageOS || null },
  dependencyClosure: {
    lockPathsWithTarball,
    uniqueTarballs: rows.length,
    downloadedUniqueTarballs: manifestRows.length,
    coveredLockPaths,
    failedUniqueTarballs: failures.length,
    casFileCount: casFileNames.length,
    casAggregateSha256: casAggregate.digest('hex'),
    manifestCoreSha256: manifest.manifestCoreSha256,
  },
  npmCi: {
    online: { status: onlineCi.status, ignoreScripts: true },
    offlineReplay: { status: offlineCi.status, ignoreScripts: true },
    installedPackageCount,
    lifecycleScriptsExecuted: false,
    fullProjectLifecycleCredit: false,
    classification: 'DEPENDENCY_GRAPH_AND_OFFLINE_INSTALL_CLOSURE_ONLY',
  },
  limitations: [
    'npm ci used --ignore-scripts; native/install lifecycle execution remains a separate current-source gate.',
    'This receipt proves exact Windows x64 Node/npm lock dependency closure, not TypeScript, lint, Webpack, Turbopack, Browser, PDF, rights, sale eligibility or LIVE.',
  ],
};
writeJson(path.join(outDir, 'P41_EXACT_WINDOWS_NODE24_DEPENDENCY_CLOSURE_RECEIPT.json'), receipt);

if (!pass) throw new Error(`Dependency CAS closure failed: ${failures.length} failures, ${coveredLockPaths}/${lockPathsWithTarball} lock paths covered`);
console.log(JSON.stringify(receipt, null, 2));
