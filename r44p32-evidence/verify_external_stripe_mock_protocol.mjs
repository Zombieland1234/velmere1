#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(process.env.VELMERE_EVIDENCE_DIR ?? 'evidence');
const REVISION = process.env.VELMERE_SOURCE_REVISION_ID;
const MANIFEST_SHA = process.env.VELMERE_SOURCE_MANIFEST_SHA256;
const AGGREGATE_SHA = process.env.VELMERE_SOURCE_AGGREGATE_SHA256;
const CLASSIFICATION = 'EXTERNAL_CI_STRIPE_MOCK_PROTOCOL_ONLY';
const EXPECTED = [
  'checkout-schema',
  'signed-webhook',
  'paymentintent-binding',
  'entitlement-activation',
  'duplicate-idempotency',
  'event-reorder',
  'replay-denial',
  'refund-schema',
  'refund-webhook',
  'entitlement-revocation',
  'reconciliation',
  'controlled-dead-letter-requeue',
];
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), status: ok ? 'PASS' : 'FAIL', detail });
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const bindingOk = (value) => value?.revisionId === REVISION
  && value?.sourceManifestSha256 === MANIFEST_SHA
  && value?.sourceAggregateSha256 === AGGREGATE_SHA;

const ledgerPath = path.join(ROOT, 'R44P32_EXTERNAL_CI_STRIPE_MOCK_LEDGER.json');
const indexPath = path.join(ROOT, 'R44P32_ARTIFACT_INDEX.json');
const auditPath = path.join(ROOT, 'R44P32_REDACTED_PROTOCOL_AUDIT.json');
check('required:ledger', fs.existsSync(ledgerPath));
check('required:index', fs.existsSync(indexPath));
check('required:audit', fs.existsSync(auditPath));
if (checks.some((row) => !row.ok)) {
  process.stdout.write(JSON.stringify({ status: 'FAIL', checks }));
  process.exit(1);
}

const ledger = readJson(ledgerPath);
const index = readJson(indexPath);
const audit = readJson(auditPath);
check('ledger:schema', ledger.schemaVersion === 'velmere.pass36.a102r44p32.external-stripe-mock-ledger.v1');
check('ledger:classification', ledger.classification === CLASSIFICATION);
check('ledger:status', ledger.status === 'PASS_EXTERNAL_CI_STRIPE_MOCK_PROTOCOL_12_OF_12_NO_STRIPE_TEST_CREDIT');
check('ledger:denominator', ledger.required === 12 && ledger.executed === 12 && ledger.passed === 12 && ledger.failed === 0);
check('ledger:case-order', JSON.stringify(ledger.requiredCaseIds) === JSON.stringify(EXPECTED) && JSON.stringify(ledger.observedCaseIds) === JSON.stringify(EXPECTED));
check('ledger:source-binding', bindingOk(ledger.sourceBinding));
check('ledger:truth-boundary', ledger.truthBoundary?.stripeMockProtocolCredit === true
  && ledger.truthBoundary?.realStripeTestCredit === false
  && ledger.truthBoundary?.realStripeWebhookDeliveryCredit === false
  && ledger.truthBoundary?.realPaymentMethodCredit === false
  && ledger.truthBoundary?.realRefundCredit === false
  && ledger.truthBoundary?.stagingCredit === false
  && ledger.truthBoundary?.customerCredit === false
  && ledger.truthBoundary?.saleCredit === false
  && ledger.truthBoundary?.liveCredit === false);
check('ledger:objects', ledger.externalSchemaObjects?.checkoutObject === 'checkout.session'
  && ledger.externalSchemaObjects?.paymentIntentObject === 'payment_intent'
  && ledger.externalSchemaObjects?.refundObject === 'refund'
  && ledger.externalSchemaObjects?.stripeMockApiVersion === 'v0.202.0');
check('ledger:state', Number.isInteger(ledger.protocolState?.uniqueEventClaims)
  && ledger.protocolState.uniqueEventClaims >= 5
  && Number.isInteger(ledger.protocolState?.entitlementRows)
  && ledger.protocolState.entitlementRows >= 2
  && ledger.protocolState.deadLettersRemaining === 0);

const casesDir = path.join(ROOT, 'cases');
const names = fs.readdirSync(casesDir).filter((name) => name.endsWith('.json')).sort();
check('cases:file-count', names.length === 12, names);
const observed = [];
for (const [indexNumber, name] of names.entries()) {
  const full = path.join(casesDir, name);
  const row = readJson(full);
  observed.push(row.caseId);
  check(`case:${indexNumber + 1}:filename`, name === `${String(indexNumber + 1).padStart(2, '0')}-${EXPECTED[indexNumber]}.json`, name);
  check(`case:${indexNumber + 1}:id`, row.caseId === EXPECTED[indexNumber], row.caseId);
  check(`case:${indexNumber + 1}:pass`, row.passed === true && row.observedOutcome === 'PASS' && row.expectedOutcome === 'PASS');
  check(`case:${indexNumber + 1}:classification`, row.classification === CLASSIFICATION && row.environmentClass === 'DISPOSABLE_EXTERNAL_CI');
  check(`case:${indexNumber + 1}:binding`, bindingOk(row.sourceBinding));
  check(`case:${indexNumber + 1}:time`, typeof row.startedAt === 'string' && typeof row.endedAt === 'string' && Date.parse(row.endedAt) >= Date.parse(row.startedAt));
  check(`case:${indexNumber + 1}:truth`, row.truthBoundary?.realStripeTestCredit === false
    && row.truthBoundary?.stripeWebhookDeliveryCredit === false
    && row.truthBoundary?.productionCredit === false
    && row.truthBoundary?.customerCredit === false
    && row.truthBoundary?.saleCredit === false
    && row.truthBoundary?.liveCredit === false);
}
check('cases:order', JSON.stringify(observed) === JSON.stringify(EXPECTED));

check('index:schema', index.schemaVersion === 'velmere.pass36.a102r44p32.external-stripe-mock-artifact-index.v1');
check('index:classification', index.classification === CLASSIFICATION);
check('index:binding', bindingOk(index.sourceBinding));
check('index:count', Array.isArray(index.artifacts) && index.artifacts.length === 12);
const indexedPaths = new Set();
for (const entry of index.artifacts ?? []) {
  const relative = String(entry.path ?? '');
  check(`index:path:${relative}`, /^evidence\/cases\/[0-9]{2}-[a-z0-9-]+\.json$/u.test(relative) && !relative.includes('..'));
  check(`index:unique:${relative}`, !indexedPaths.has(relative));
  indexedPaths.add(relative);
  const absolute = path.resolve(path.dirname(ROOT), relative);
  check(`index:inside:${relative}`, absolute.startsWith(`${path.resolve(path.dirname(ROOT))}${path.sep}`));
  const bytes = fs.readFileSync(absolute);
  check(`index:bytes:${relative}`, entry.byteLength === bytes.length, { expected: entry.byteLength, actual: bytes.length });
  check(`index:sha:${relative}`, entry.sha256 === sha256(bytes), { expected: entry.sha256, actual: sha256(bytes) });
}
check('index:bijection', indexedPaths.size === names.length && names.every((name) => indexedPaths.has(`evidence/cases/${name}`)));

check('audit:schema', audit.schemaVersion === 'velmere.pass36.a102r44p32.redacted-protocol-audit.v1');
check('audit:classification', audit.classification === CLASSIFICATION);
check('audit:redaction-flags', audit.rawWebhookSecretsStored === false && audit.rawApiKeysStored === false && audit.rawWebhookPayloadsStored === false);
check('audit:rows', Array.isArray(audit.rows) && audit.rows.length >= 6);

const allFiles = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`SYMLINK_FORBIDDEN:${full}`);
    if (stat.isDirectory()) walk(full);
    else if (stat.isFile()) allFiles.push(full);
  }
};
walk(ROOT);
const joined = allFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const forbiddenPatterns = [
  /sk_live_[A-Za-z0-9_-]+/u,
  /pk_live_[A-Za-z0-9_-]+/u,
  /whsec_[A-Za-z0-9_-]{12,}/u,
  /authorization\s*:\s*bearer/iu,
  /rawWebhookPayload\s*:/u,
  /customer_email/iu,
  /card_number/iu,
];
check('security:no-sensitive-patterns', forbiddenPatterns.every((pattern) => !pattern.test(joined)));
check('security:no-source-maps', allFiles.every((file) => !file.endsWith('.map')));
check('security:no-private-keys', !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(joined));

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: 'velmere.pass36.a102r44p32.independent-external-ci-verification.v1',
  status: failed.length === 0 ? 'PASS_INDEPENDENT_EXTERNAL_CI_STRIPE_MOCK_PROTOCOL' : 'FAIL_INDEPENDENT_EXTERNAL_CI_STRIPE_MOCK_PROTOCOL',
  classification: CLASSIFICATION,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  sourceBinding: { revisionId: REVISION, sourceManifestSha256: MANIFEST_SHA, sourceAggregateSha256: AGGREGATE_SHA },
  truthBoundary: {
    stripeMockProtocolCredit: failed.length === 0,
    realStripeTestCredit: false,
    realStripeWebhookDeliveryCredit: false,
    saleCredit: false,
    liveCredit: false,
  },
};
const out = Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(path.dirname(ROOT), 'R44P32_INDEPENDENT_EXTERNAL_CI_VERIFICATION.json'), out, { mode: 0o600 });
process.stdout.write(JSON.stringify({ status: result.status, checks: result.checks, passed: result.passed, failed: result.failed }));
process.exit(failed.length === 0 ? 0 : 1);
