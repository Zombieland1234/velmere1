import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const VELMERE_RUNTIME = Object.freeze({
  node: '24.18.0',
  nodeWithPrefix: 'v24.18.0',
  nodeEngine: '>=24.18.0 <25',
  npm: '11.16.0',
  npmEngine: '>=11.16.0 <12',
  dockerImage: 'node:24.18.0-bookworm-slim',
  receiptMaxAgeHours: 24,
});

export function currentNpmVersion() {
  const userAgent = process.env.npm_config_user_agent ?? '';
  const userAgentMatch = /(?:^|\s)npm\/([^\s]+)/u.exec(userAgent);
  if (userAgentMatch?.[1]) return userAgentMatch[1];

  const execPath = process.env.npm_execpath;
  if (execPath) {
    try {
      let cursor = path.dirname(path.resolve(execPath));
      for (let depth = 0; depth < 8; depth += 1) {
        const packagePath = path.join(cursor, "package.json");
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
          if (packageJson?.name === "npm" && typeof packageJson.version === "string") {
            return packageJson.version;
          }
        }
        const parent = path.dirname(cursor);
        if (parent === cursor) break;
        cursor = parent;
      }
    } catch {
      // Fall through to the npm executable probe.
    }
  }

  try {
    return execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

export function assertCurrentRuntime({ npmVersion = currentNpmVersion(), label = 'Velmere runtime' } = {}) {
  const errors = [];
  if (process.version !== VELMERE_RUNTIME.nodeWithPrefix) {
    errors.push(`Node ${VELMERE_RUNTIME.nodeWithPrefix} required, got ${process.version}`);
  }
  if (npmVersion !== VELMERE_RUNTIME.npm) {
    errors.push(`npm ${VELMERE_RUNTIME.npm} required, got ${npmVersion ?? 'unavailable'}`);
  }
  if (errors.length) throw new Error(`${label} contract failed: ${errors.join('; ')}`);
  return { node: process.version, npm: npmVersion };
}

function walk(directory, root, output) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (['node_modules', '.git', '.next', '.velmere'].includes(entry.name) || entry.name.startsWith('.next-pass')) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, root, output);
    else if (entry.isFile()) output.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
}

export function computeSourceFingerprint(root = process.cwd()) {
  const candidates = [];
  for (const file of ['package.json', 'package-lock.json', 'next.config.mjs', '.nvmrc', '.node-version']) {
    if (fs.existsSync(path.join(root, file))) candidates.push(file);
  }
  for (const directory of ['app', 'components', 'lib', 'scripts']) walk(path.join(root, directory), root, candidates);
  const files = [...new Set(candidates)].sort((a, b) => a.localeCompare(b));
  const hash = crypto.createHash('sha256');
  for (const relative of files) {
    const absolute = path.join(root, relative);
    const stat = fs.statSync(absolute);
    hash.update(relative).update('\0').update(String(stat.size)).update('\0');
    hash.update(fs.readFileSync(absolute)).update('\0');
  }
  return { algorithm: 'sha256', sha256: hash.digest('hex'), fileCount: files.length };
}

export function createExecutionIdentity({ root = process.cwd(), runId = crypto.randomUUID() } = {}) {
  return {
    runId,
    node: process.version,
    npm: currentNpmVersion(),
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    hostnameSha256: crypto.createHash('sha256').update(os.hostname()).digest('hex'),
    workspaceSha256: crypto.createHash('sha256').update(path.resolve(root)).digest('hex'),
    startedAt: new Date().toISOString(),
    source: computeSourceFingerprint(root),
  };
}

export function assertFreshReceipt(receipt, {
  expectedSourceSha256,
  now = Date.now(),
  maxAgeHours = VELMERE_RUNTIME.receiptMaxAgeHours,
  label = 'receipt',
} = {}) {
  const errors = [];
  if (!receipt || typeof receipt !== 'object') errors.push('missing object');
  if (receipt?.node !== VELMERE_RUNTIME.nodeWithPrefix) errors.push(`node=${receipt?.node ?? 'missing'}`);
  if (receipt?.npm !== VELMERE_RUNTIME.npm) errors.push(`npm=${receipt?.npm ?? 'missing'}`);
  if (!receipt?.runId || typeof receipt.runId !== 'string') errors.push('runId missing');
  if (!receipt?.source?.sha256 || typeof receipt.source.sha256 !== 'string') errors.push('source fingerprint missing');
  if (expectedSourceSha256 && receipt?.source?.sha256 !== expectedSourceSha256) errors.push('source fingerprint drift');
  const finished = Date.parse(receipt?.finishedAt ?? receipt?.createdAt ?? '');
  if (!Number.isFinite(finished)) errors.push('finishedAt missing/invalid');
  else {
    const ageMs = now - finished;
    if (ageMs < -5 * 60_000) errors.push('receipt timestamp is in the future');
    if (ageMs > maxAgeHours * 3_600_000) errors.push(`receipt older than ${maxAgeHours}h`);
  }
  if (errors.length) throw new Error(`${label} rejected: ${errors.join('; ')}`);
  return true;
}
