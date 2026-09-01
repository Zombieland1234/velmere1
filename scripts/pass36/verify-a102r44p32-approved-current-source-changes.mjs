#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REV = 'VELMERE_PASS36_A102R44P32_ACTION_REQUIRED_LOCAL_DURABLE_STRIPE_PROTOCOL_LIFECYCLE12_REAL_STRIPE_TEST_BLOCKED_NO_LIVE_CREDIT';
const PARENT = 'VELMERE_PASS36_A102R44P31_ACTION_REQUIRED_EXTERNAL_CI_LOCALSTACK_STORAGE_KMS_EMAIL10_SIGSTORE_OIDC_AND_PARENT_EXACT_RELEASE_NO_LIVE_CREDIT';
const PM = '_velmere/PASS36_A102R44P31_SOURCE_ONLY_MANIFEST.json';
const CM = '_velmere/PASS36_A102R44P32_SOURCE_ONLY_MANIFEST.json';
const LEDGER = 'config/pass36/a102r44p32-approved-current-source-changes.json';
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const forbidden = new Set(['.cache', '.git', '.turbo', '.velmere', '__pycache__', 'artifacts', 'build', 'cache', 'coverage', 'dist', 'node_modules', 'out', 'playwright-report', 'temp', 'test-results', 'tmp']);
const reject = (rel) => { const pieces = rel.split('/'); const top = pieces[0] ?? ''; return forbidden.has(top) || top.startsWith('.next') || top === '.env' || top.startsWith('.env.') || pieces.includes('__pycache__') || rel.endsWith('.pyc') || rel.endsWith('.tsbuildinfo') || rel.endsWith('.map'); };
function collect() {
  const rows = [];
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (rel === CM || rel === LEDGER) continue;
      const full = path.join(directory, entry.name); const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error(`symlink:${rel}`);
      if (entry.isDirectory()) { if (!reject(rel)) walk(full, rel); continue; }
      if (!entry.isFile() || reject(rel)) continue;
      const bytes = fs.readFileSync(full); rows.push({ path: rel, byteLength: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o777 });
    }
  }
  walk(ROOT); return rows.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
}
const parent = JSON.parse(fs.readFileSync(path.join(ROOT, PM), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER), 'utf8'));
const parentMap = new Map(parent.entries.map((row) => [row.path, row]));
const currentMap = new Map(collect().map((row) => [row.path, row]));
const changes = [];
for (const rel of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)))) {
  const before = parentMap.get(rel); const after = currentMap.get(rel);
  if (!before && after) changes.push({ path: rel, change: 'ADDED', after });
  else if (before && !after) changes.push({ path: rel, change: 'DELETED', before });
  else if (before && after && (before.sha256 !== after.sha256 || before.byteLength !== after.byteLength || before.mode !== after.mode)) changes.push({ path: rel, change: 'MODIFIED', before, after });
}
const same = (a, b) => (a == null && b == null) || (a && b && a.path === b.path && a.byteLength === b.byteLength && a.sha256 === b.sha256 && a.mode === b.mode);
const removedTests = changes.filter((row) => row.change === 'DELETED' && (row.path.toLowerCase().includes('test') || row.path.includes('/tests/')));
const history = changes.filter((row) => row.change !== 'ADDED' && /(?:^|[/_.-])a102r44p(?:[0-9]|1[0-9]|2[0-9]|3[01])(?:[/_.-]|$)/iu.test(row.path));
const checks = []; const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add('schema', ledger.schemaVersion === 'velmere.pass36.a102r44p32.approved-source-changes.v1');
add('revision', ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
add('parent-hash', ledger.parentManifestSha256 === sha(fs.readFileSync(path.join(ROOT, PM))));
add('changes-exact', ledger.changes.length === changes.length && ledger.changes.every((row, index) => { const expected = changes[index]; return row.path === expected.path && row.change === expected.change && same(row.before, expected.before) && same(row.after, expected.after); }));
add('counts', ledger.addedCount === changes.filter((row) => row.change === 'ADDED').length && ledger.modifiedCount === changes.filter((row) => row.change === 'MODIFIED').length && ledger.deletedCount === 0);
add('no-history-mutation', history.length === 0 && ledger.historyMutations === 0, history.map((row) => row.path));
add('no-deletion', changes.every((row) => row.change !== 'DELETED'));
add('no-test-removal', removedTests.length === 0 && ledger.removedTests === 0);
add('no-collapse', ledger.denominatorCollapse === false);
add('required-added', ledger.requiredAddedFiles.every((file) => changes.some((row) => row.path === file && row.change === 'ADDED')));
add('required-modified', ledger.requiredModifiedFiles.every((file) => changes.some((row) => row.path === file && row.change === 'MODIFIED')));
add('decision', ledger.decision === 'APPROVED_ACTION_REQUIRED_NO_PROMOTION');
add('manifest-excluded', !changes.some((row) => row.path === CM));
add('ledger-excluded', !changes.some((row) => row.path === LEDGER));
const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({ schemaVersion: 'velmere.pass36.a102r44p32.approved-source-changes-verification.v1', status: failed.length ? 'FAIL' : 'PASS', checks: checks.length, passed: checks.length - failed.length, failed: failed.length, changes: changes.length, historyMutations: history.length, rows: checks }, null, 2));
if (failed.length) process.exit(1);
