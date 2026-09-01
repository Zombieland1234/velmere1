#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));
const args = process.argv.slice(2);
const value = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const output = path.resolve(value('--output', path.join(ROOT, 'p42-out', 'P42_NATIVE_PLATFORM_AVAILABILITY.json')));
const sha256File = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const targetKey = `${process.platform}-${process.arch}`;
const expectedByTarget = {
  'win32-x64': [
    ['@next/swc-win32-x64-msvc', '16.2.12'], ['@swc/core-win32-x64-msvc', '1.15.47'],
    ['@parcel/watcher-win32-x64', '2.6.0'], ['@esbuild/win32-x64', '0.28.1'], ['@img/sharp-win32-x64', '0.35.3'],
  ],
  'linux-x64': [
    ['@next/swc-linux-x64-gnu', '16.2.12'], ['@swc/core-linux-x64-gnu', '1.15.47'],
    ['@parcel/watcher-linux-x64-glibc', '2.6.0'], ['@esbuild/linux-x64', '0.28.1'],
    ['@img/sharp-linux-x64', '0.35.3'], ['@img/sharp-libvips-linux-x64', '1.3.2'],
  ],
};
const expected = expectedByTarget[targetKey] || [];
const packageRows = expected.map(([name, version]) => {
  const lockPath = `node_modules/${name}`;
  const lockEntry = lock.packages?.[lockPath];
  const candidateManifestPath = path.join(ROOT, lockPath, 'package.json');
  let manifestPath = null, installedVersion = null, resolveError = null;
  try {
    if (!fs.existsSync(candidateManifestPath)) throw new Error(`installed_manifest_missing:${candidateManifestPath}`);
    manifestPath = candidateManifestPath;
    installedVersion = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version;
  } catch (error) { resolveError = String(error?.message || error); }
  return {
    name, expectedVersion: version, lockPath, lockVersion: lockEntry?.version || null,
    presentInLock: Boolean(lockEntry), manifestPath: manifestPath ? path.relative(ROOT, manifestPath).replaceAll('\\','/') : null,
    installedVersion, presentOnDisk: Boolean(manifestPath), versionMatches: installedVersion === version && lockEntry?.version === version,
    resolveError,
  };
});
const runtimeProbes = [];
function probe(name, fn) {
  try { const result = fn(); runtimeProbes.push({ name, status: 'PASS', result: String(result).slice(0, 500) }); }
  catch (error) { runtimeProbes.push({ name, status: 'FAIL', error: String(error?.stack || error).slice(0, 3000) }); }
}
probe('next-swc-platform-binding', () => requireFromRoot(expected.find(([n]) => n.startsWith('@next/swc-'))?.[0]));
probe('swc-core-load', () => requireFromRoot('@swc/core').version || 'loaded');
probe('parcel-watcher-load', () => typeof requireFromRoot('@parcel/watcher').subscribe === 'function');
probe('esbuild-version', () => requireFromRoot('esbuild').version);
probe('sharp-load', () => JSON.stringify(requireFromRoot('sharp').versions));
const blockers = [];
if (!expected.length) blockers.push(`UNSUPPORTED_PROBE_TARGET:${targetKey}`);
for (const row of packageRows) if (!row.versionMatches) blockers.push(`PLATFORM_PACKAGE_MISSING_OR_VERSION_MISMATCH:${row.name}`);
for (const row of runtimeProbes) if (row.status !== 'PASS') blockers.push(`RUNTIME_PROBE_FAIL:${row.name}`);
const receipt = {
  schemaVersion: 'velmere.p42.native-platform-availability.v1',
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'FAIL' : 'PASS',
  classification: blockers.length ? 'NATIVE_PLATFORM_REQUIREMENTS_UNAVAILABLE' : 'NATIVE_PLATFORM_REQUIREMENTS_AVAILABLE_WITHOUT_DEPENDENCY_LIFECYCLE_EXECUTION',
  runtime: { platform: process.platform, arch: process.arch, node: process.version, targetKey },
  bindings: { packageLockSha256: sha256File(path.join(ROOT, 'package-lock.json')), packageJsonSha256: sha256File(path.join(ROOT, 'package.json')) },
  expectedPlatformPackages: packageRows,
  runtimeProbes,
  blockers,
  lifecycleScriptsExecuted: false,
  networkAccessAttemptedByProbe: false,
  credit: { nativePlatformAvailability: blockers.length === 0, semanticOrBuildClosure: false, browser: false, pdf: false, goInternal: false, goPaid: false },
};
receipt.integritySha256 = crypto.createHash('sha256').update(stable(receipt)).digest('hex');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, classification: receipt.classification, blockers, output }, null, 2));
if (blockers.length) process.exitCode = 1;
