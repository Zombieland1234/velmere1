import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { computeSourceFingerprint } from './velmere-runtime-contract.mjs';
import { writeJsonAtomic } from './pass4671-stage-runner.mjs';

const ROOT_EXCLUSIONS = new Set([
  '.git', '.velmere', 'node_modules', 'artifacts',
  'VELMERE_FOUNDER_MASTER_WORLDCLASS.txt',
]);

function normalize(relative) {
  return relative.split(path.sep).join('/');
}

function shouldExclude(name) {
  return ROOT_EXCLUSIONS.has(name) || name.startsWith('.next');
}

export function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sha256File(file) {
  const hash = crypto.createHash('sha256');
  const handle = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) {
      const bytes = fs.readSync(handle, buffer, 0, buffer.length, null);
      if (!bytes) break;
      hash.update(buffer.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest('hex');
}

function walk(directory, root, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (shouldExclude(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = normalize(path.relative(root, absolute));
    if (entry.isDirectory()) walk(absolute, root, output);
    else if (entry.isFile()) {
      const stat = fs.statSync(absolute);
      output.push({ path: relative, type: 'file', bytes: stat.size, sha256: sha256File(absolute), mode: stat.mode & 0o777 });
    } else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(absolute);
      output.push({ path: relative, type: 'symlink', target, sha256: sha256Buffer(target) });
    }
  }
}

export function createTreeManifest(root) {
  const entries = [];
  walk(root, root, entries);
  const canonical = entries.map((entry) => entry.type === 'file'
    ? `${entry.type}\0${entry.path}\0${entry.bytes}\0${entry.sha256}\0${entry.mode}`
    : `${entry.type}\0${entry.path}\0${entry.target}\0${entry.sha256}`).join('\n');
  return {
    algorithm: 'sha256',
    entryCount: entries.length,
    fileCount: entries.filter((item) => item.type === 'file').length,
    symlinkCount: entries.filter((item) => item.type === 'symlink').length,
    totalBytes: entries.filter((item) => item.type === 'file').reduce((sum, item) => sum + item.bytes, 0),
    treeRootSha256: sha256Buffer(canonical),
    entries,
  };
}

export function verifyTreeAgainstManifest(root, manifest) {
  const actual = createTreeManifest(root);
  const errors = [];
  for (const key of ['entryCount', 'fileCount', 'symlinkCount', 'totalBytes', 'treeRootSha256']) {
    if (actual[key] !== manifest[key]) errors.push(`${key}: expected ${manifest[key]}, got ${actual[key]}`);
  }
  if (actual.entries.length === manifest.entries.length) {
    for (let index = 0; index < actual.entries.length; index += 1) {
      if (JSON.stringify(actual.entries[index]) !== JSON.stringify(manifest.entries[index])) {
        errors.push(`entry drift at ${actual.entries[index]?.path ?? manifest.entries[index]?.path ?? index}`);
        break;
      }
    }
  }
  if (errors.length) throw new Error(`Frozen source verification failed: ${errors.join('; ')}`);
  return actual;
}

export function copyTree(source, target, { onEntryCopied } = {}) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (shouldExclude(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to, { onEntryCopied });
    else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      fs.chmodSync(to, fs.statSync(from).mode & 0o777);
      onEntryCopied?.(from, to);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(from), to);
      onEntryCopied?.(from, to);
    }
  }
}

export function freezeSource({ root, stateDirectory, evidenceDirectory, onEntryCopied } = {}) {
  if (!root || !stateDirectory || !evidenceDirectory) throw new Error('root, stateDirectory and evidenceDirectory are required');
  const sourceBefore = computeSourceFingerprint(root);
  const sourceDirectory = path.join(stateDirectory, 'source');
  fs.rmSync(sourceDirectory, { recursive: true, force: true });
  fs.mkdirSync(stateDirectory, { recursive: true });
  copyTree(root, sourceDirectory, { onEntryCopied });
  const sourceAfter = computeSourceFingerprint(root);
  if (sourceBefore.sha256 !== sourceAfter.sha256 || sourceBefore.fileCount !== sourceAfter.fileCount) {
    fs.rmSync(sourceDirectory, { recursive: true, force: true });
    throw new Error('Source changed while frozen snapshot was being created');
  }
  const snapshotSource = computeSourceFingerprint(sourceDirectory);
  if (snapshotSource.sha256 !== sourceBefore.sha256 || snapshotSource.fileCount !== sourceBefore.fileCount) {
    fs.rmSync(sourceDirectory, { recursive: true, force: true });
    throw new Error('Frozen snapshot source fingerprint does not match the source root');
  }
  const manifest = createTreeManifest(sourceDirectory);
  const receipt = {
    id: 'pass4673-frozen-source-v1',
    ok: true,
    createdAt: new Date().toISOString(),
    source: sourceBefore,
    manifest: {
      algorithm: manifest.algorithm,
      entryCount: manifest.entryCount,
      fileCount: manifest.fileCount,
      symlinkCount: manifest.symlinkCount,
      totalBytes: manifest.totalBytes,
      treeRootSha256: manifest.treeRootSha256,
    },
  };
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  writeJsonAtomic(path.join(stateDirectory, 'frozen-source-manifest.json'), manifest);
  writeJsonAtomic(path.join(stateDirectory, 'frozen-source-receipt.json'), receipt);
  writeJsonAtomic(path.join(evidenceDirectory, 'frozen-source-manifest.json'), manifest);
  writeJsonAtomic(path.join(evidenceDirectory, 'frozen-source-receipt.json'), receipt);
  return { sourceDirectory, manifest, receipt };
}

export function loadFrozenSource({ stateDirectory } = {}) {
  const sourceDirectory = path.join(stateDirectory, 'source');
  const manifestFile = path.join(stateDirectory, 'frozen-source-manifest.json');
  const receiptFile = path.join(stateDirectory, 'frozen-source-receipt.json');
  if (!fs.existsSync(sourceDirectory) || !fs.existsSync(manifestFile) || !fs.existsSync(receiptFile)) {
    throw new Error('Frozen source state is incomplete');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  verifyTreeAgainstManifest(sourceDirectory, manifest);
  const source = computeSourceFingerprint(sourceDirectory);
  if (source.sha256 !== receipt.source.sha256 || source.fileCount !== receipt.source.fileCount) {
    throw new Error('Frozen source fingerprint drift');
  }
  return { sourceDirectory, manifest, receipt };
}

export function cloneFrozenSource({ sourceDirectory, manifest, targetDirectory } = {}) {
  fs.rmSync(targetDirectory, { recursive: true, force: true });
  copyTree(sourceDirectory, targetDirectory);
  verifyTreeAgainstManifest(targetDirectory, manifest);
  return targetDirectory;
}
