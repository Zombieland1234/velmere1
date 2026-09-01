#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REV = 'VELMERE_PASS36_A102R44P32_ACTION_REQUIRED_LOCAL_DURABLE_STRIPE_PROTOCOL_LIFECYCLE12_REAL_STRIPE_TEST_BLOCKED_NO_LIVE_CREDIT';
const PARENT = 'VELMERE_PASS36_A102R44P31_ACTION_REQUIRED_EXTERNAL_CI_LOCALSTACK_STORAGE_KMS_EMAIL10_SIGSTORE_OIDC_AND_PARENT_EXACT_RELEASE_NO_LIVE_CREDIT';
const MANIFEST = '_velmere/PASS36_A102R44P32_SOURCE_ONLY_MANIFEST.json';
const PARENT_MANIFEST = '_velmere/PASS36_A102R44P31_SOURCE_ONLY_MANIFEST.json';
const LEDGER = 'config/pass36/a102r44p32-approved-current-source-changes.json';
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const forbidden = new Set(['.cache', '.git', '.turbo', '.velmere', '__pycache__', 'artifacts', 'build', 'cache', 'coverage', 'dist', 'node_modules', 'out', 'playwright-report', 'temp', 'test-results', 'tmp']);
const reject = (rel) => {
  const pieces = rel.split('/');
  const top = pieces[0] ?? '';
  return forbidden.has(top) || top.startsWith('.next') || top === '.env' || top.startsWith('.env.') || pieces.includes('__pycache__') || rel.endsWith('.pyc') || rel.endsWith('.tsbuildinfo') || rel.endsWith('.map');
};
function collect() {
  const rows = [];
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (rel === MANIFEST) continue;
      const full = path.join(directory, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) throw new Error(`symlink:${rel}`);
      if (entry.isDirectory()) {
        if (!reject(rel)) walk(full, rel);
        continue;
      }
      if (!entry.isFile() || reject(rel)) continue;
      const bytes = fs.readFileSync(full);
      rows.push({ path: rel, byteLength: bytes.length, sha256: sha(bytes), mode: stat.mode & 0o777 });
    }
  }
  walk(ROOT);
  return rows.sort((a, b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
}
const manifestBytes = fs.readFileSync(path.join(ROOT, MANIFEST));
const manifest = JSON.parse(manifestBytes);
const rows = collect();
const byteLength = rows.reduce((sum, row) => sum + row.byteLength, 0);
const pathSetSha256 = sha(Buffer.from(`${rows.map((row) => row.path).join('\n')}\n`));
const aggregateSha256 = sha(Buffer.from(`${rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode.toString(8)}`).join('\n')}\n`));
const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/pass36/a102r44p32-action-required-current-state.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/pass36/a102r44p32-local-durable-stripe-lifecycle-policy.json'), 'utf8'));
const pointer = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/pass36/current-release-authority.json'), 'utf8'));
const checks = [];
const add = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
add('schema', manifest.schemaVersion === 'velmere.pass36.a102r44p32.source-manifest.v1');
add('revision', manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
add('count', manifest.fileCount === rows.length, { expected: manifest.fileCount, actual: rows.length });
add('bytes', manifest.byteLength === byteLength, { expected: manifest.byteLength, actual: byteLength });
add('pathset', manifest.pathSetSha256 === pathSetSha256);
add('aggregate', manifest.aggregateSha256 === aggregateSha256);
add('entries', manifest.entries.length === rows.length && manifest.entries.every((row, index) => row.path === rows[index].path && row.byteLength === rows[index].byteLength && row.sha256 === rows[index].sha256 && row.mode === rows[index].mode));
add('active', fs.readFileSync(path.join(ROOT, 'VELMERE_ACTIVE_PASS.txt'), 'utf8').trim() === REV);
add('flags', state.globalDecision === 'NO_GO' && [state.LIVE, state.saleEnabled, state.productionApproved, state.worldClassProven].every((value) => value === false));
add('approved-bound', manifest.approvedChangesPath === LEDGER && manifest.approvedChangesSha256 === sha(fs.readFileSync(path.join(ROOT, LEDGER))));
add('parent-bound', manifest.parentManifestPath === PARENT_MANIFEST && manifest.parentManifestSha256 === sha(fs.readFileSync(path.join(ROOT, PARENT_MANIFEST))));
add('policy', policy.revisionId === REV && policy.parentRevisionId === PARENT && policy.classification === 'LOCAL_DISPOSABLE_STRIPE_API_FIXTURE_AND_WEBHOOK_LEDGER_ONLY');
add('local-contract', policy.requiredDenominator === 12 && policy.independentVerifierChecks === 45 && state.currentLocalStripeEvidenceContract.required === 12 && state.currentLocalStripeEvidenceContract.independentVerifierChecks === 45);
add('real-stripe-zero', state.externalCredits.realStripeTest12 === false && state.currentLocalStripeEvidenceContract.realStripeTestFullLifecycleCredit === false && policy.truthBoundary.realStripeTestApiCredit === false);
add('no-promotion', [policy.truthBoundary.realStripeHostedCheckoutCredit, policy.truthBoundary.realStripeWebhookDeliveryCredit, policy.truthBoundary.productionPaymentCredit, policy.truthBoundary.customerCredit, policy.truthBoundary.saleCredit, policy.truthBoundary.liveCredit].every((value) => value === false));
add('child-credit-false', Object.values(state.currentByteCredit).every((value) => value === false));
add('retained-parent', state.retainedParentEvidence.parentExactLinuxRelease === true && state.retainedParentEvidence.parentExternalCiLocalstackStorageKmsEmail10 === true && state.retainedParentEvidence.notCurrentChildReleaseCredit === true);
add('pointers', pointer.authorityRevisionId === REV && pointer.sourceRevisionId === REV && pointer.parentRevisionId === PARENT && pointer.currentSource?.revisionId === REV && pointer.currentSource?.parentRevisionId === PARENT);
add('basic-free', state.skuDecisions.basic === 'ALWAYS_FREE_ACTION_REQUIRED');
add('pro-beta', state.skuDecisions.pro === 'INVITATION_ONLY_CONTROLLED_BETA_MANUAL_QA_REQUIRED');
add('advanced-stop', state.skuDecisions.advanced === 'NOT_FOR_SALE');
add('roadmap', fs.readFileSync(path.join(ROOT, 'VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt'), 'utf8').startsWith('================================================================================\nVELMÈRE WORLD CLASS MAX ROADMAP — PASS36 A102R44P32'));
const failed = checks.filter((row) => !row.ok);
console.log(JSON.stringify({
  schemaVersion: 'velmere.pass36.a102r44p32.source-authority-verification.v1',
  status: failed.length ? 'FAIL' : 'PASS_R44P32_SOURCE_AUTHORITY',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  revisionId: REV,
  manifestSha256: sha(manifestBytes),
  aggregateSha256,
  fileCount: rows.length,
  sourceImmutable: true,
  rows: checks,
}, null, 2));
if (failed.length) process.exit(1);
