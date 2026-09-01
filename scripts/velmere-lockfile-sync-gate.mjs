#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

const blockers = [];
if (!existsSync('package.json')) blockers.push('package.json missing');
if (!existsSync('package-lock.json')) blockers.push('package-lock.json missing; npm ci cannot be trusted');

let payload = { schemaVersion: 'velmere.pass2106.lockfile-sync-gate.v1', generatedAt: new Date().toISOString() };
if (!blockers.length) {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const root = lock.packages?.[''] ?? {};
  const pkgDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const lockDeps = { ...(root.dependencies ?? {}), ...(root.devDependencies ?? {}) };
  const missingInLock = Object.keys(pkgDeps).filter((name) => !Object.prototype.hasOwnProperty.call(lockDeps, name));
  const versionMismatch = Object.keys(pkgDeps)
    .filter((name) => Object.prototype.hasOwnProperty.call(lockDeps, name))
    .filter((name) => String(pkgDeps[name]) !== String(lockDeps[name]))
    .map((name) => ({ name, packageJson: pkgDeps[name], packageLock: lockDeps[name] }));
  if (lock.lockfileVersion !== 3) blockers.push(`package-lock lockfileVersion must be 3, got ${lock.lockfileVersion}`);
  if (root.name !== pkg.name) blockers.push(`package-lock root name mismatch: ${root.name} !== ${pkg.name}`);
  if (root.version !== pkg.version) blockers.push(`package-lock root version mismatch: ${root.version} !== ${pkg.version}`);
  if (missingInLock.length) blockers.push(`package-lock missing dependencies: ${missingInLock.join(', ')}`);
  if (versionMismatch.length) blockers.push(`package-lock dependency range mismatch: ${versionMismatch.map((item) => `${item.name}(${item.packageJson} != ${item.packageLock})`).join(', ')}`);
  if (pkg.packageManager !== 'npm@11.16.0') blockers.push(`packageManager must be npm@11.16.0, got ${pkg.packageManager}`);
  if (pkg.engines?.node !== '>=24.18.0 <25') blockers.push(`node engine must be >=24.18.0 <25, got ${pkg.engines?.node}`);
  if (pkg.engines?.npm !== '>=11.16.0 <12') blockers.push(`npm engine must be >=11.16.0 <12, got ${pkg.engines?.npm}`);
  payload = {
    ...payload,
    status: blockers.length ? 'FAIL' : 'PASS',
    packageManager: pkg.packageManager,
    engines: pkg.engines,
    packageLockVersion: lock.lockfileVersion,
    dependencyCount: Object.keys(pkgDeps).length,
    missingInLock,
    versionMismatch,
    blockers,
  };
} else {
  payload = { ...payload, status: 'FAIL', blockers };
}

mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2106_LOCKFILE_SYNC_GATE.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
process.exit(blockers.length ? 1 : 0);
