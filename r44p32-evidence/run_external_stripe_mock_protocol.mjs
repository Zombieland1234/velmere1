#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REVISION = process.env.VELMERE_SOURCE_REVISION_ID;
const MANIFEST_SHA = process.env.VELMERE_SOURCE_MANIFEST_SHA256;
const AGGREGATE_SHA = process.env.VELMERE_SOURCE_AGGREGATE_SHA256;
const API_BASE = process.env.STRIPE_MOCK_API_BASE ?? 'http://127.0.0.1:12111';
const EVIDENCE_DIR = path.resolve(process.env.VELMERE_EVIDENCE_DIR ?? 'evidence');
const RUN_ID = process.env.GITHUB_RUN_ID ?? 'local';
const CLASSIFICATION = 'EXTERNAL_CI_STRIPE_MOCK_PROTOCOL_ONLY';
const WEBHOOK_SECRET = 'whsec_r44p32_mock_protocol_only_not_a_credential';
const MOCK_API_KEY = 'sk_test_r44p32_mock_protocol_only_not_a_credential';
const AMOUNT = 4900;
const CURRENCY = 'eur';
const PRODUCT_ID = 'vlm_pro_analysis_single';
const ACCOUNT_HASH = crypto.createHash('sha256').update(`account:${RUN_ID}`).digest('hex');
const CONTEXT_HASH = crypto.createHash('sha256').update(`context:${RUN_ID}`).digest('hex');
const REQUIRED_CASE_IDS = [
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

if (!REVISION || !MANIFEST_SHA || !AGGREGATE_SHA) throw new Error('SOURCE_BINDING_ENV_MISSING');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true, mode: 0o700 });
const CASES_DIR = path.join(EVIDENCE_DIR, 'cases');
fs.mkdirSync(CASES_DIR, { recursive: true, mode: 0o700 });

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
};
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(stable(value))}\n`, 'utf8');
const sha256Bytes = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sha256Text = (value) => sha256Bytes(Buffer.from(String(value), 'utf8'));
const now = () => new Date().toISOString();
const writeJson = (target, value) => {
  const bytes = jsonBytes(value);
  fs.writeFileSync(target, bytes, { mode: 0o600 });
  return { bytes: bytes.length, sha256: sha256Bytes(bytes) };
};

async function stripeRequest(pathname, params = {}) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const row of value) body.append(key, String(row));
    else if (value !== undefined && value !== null) body.set(key, String(value));
  }
  const response = await fetch(new URL(pathname, API_BASE), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${MOCK_API_KEY}`,
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`STRIPE_MOCK_NON_JSON:${response.status}`); }
  if (!response.ok) throw new Error(`STRIPE_MOCK_HTTP_${response.status}:${json?.error?.type ?? 'unknown'}`);
  return json;
}

function signPayload(raw, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${raw}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function verifySignature(raw, header, maxAgeSeconds = 300) {
  const pieces = Object.fromEntries(String(header).split(',').map((part) => part.split('=', 2)));
  const timestamp = Number(pieces.t);
  const signature = pieces.v1 ?? '';
  if (!Number.isInteger(timestamp) || !/^[a-f0-9]{64}$/u.test(signature)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > maxAgeSeconds) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${raw}`, 'utf8').digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function event(id, type, object, created = Math.floor(Date.now() / 1000)) {
  return { id, object: 'event', api_version: '2025-02-24.acacia', created, data: { object }, livemode: false, type };
}

const state = { eventHashes: new Map(), entitlements: new Map(), deadLetters: new Map(), audit: [] };
const terminal = (status) => ['REFUNDED', 'CHARGEBACK_REVOKED', 'ACCOUNT_DELETED'].includes(status);

function handleWebhook(raw, signatureHeader, { allowDeadLetter = true } = {}) {
  const rawHash = sha256Text(raw);
  if (!verifySignature(raw, signatureHeader)) {
    if (allowDeadLetter) {
      const id = `dlq_${rawHash.slice(0, 20)}`;
      state.deadLetters.set(id, { id, rawHash, reason: 'INVALID_SIGNATURE', attempts: 0, payloadStored: false, createdAt: now() });
      state.audit.push({ action: 'dead_letter', id, rawHash, reason: 'INVALID_SIGNATURE' });
      return { accepted: false, deadLetterId: id, reason: 'INVALID_SIGNATURE' };
    }
    return { accepted: false, reason: 'INVALID_SIGNATURE' };
  }
  const parsed = JSON.parse(raw);
  if (parsed.livemode !== false) return { accepted: false, reason: 'LIVEMODE_FORBIDDEN' };
  const prior = state.eventHashes.get(parsed.id);
  if (prior) {
    if (prior !== rawHash) return { accepted: false, reason: 'EVENT_ID_PAYLOAD_MISMATCH' };
    return { accepted: true, duplicate: true, eventId: parsed.id };
  }
  state.eventHashes.set(parsed.id, rawHash);
  const object = parsed.data?.object ?? {};
  const entitlementKey = `${object.metadata?.accountHash ?? ''}:${object.metadata?.productId ?? ''}`;
  if (parsed.type === 'checkout.session.completed') {
    const bindingOk = object.payment_status === 'paid'
      && object.status === 'complete'
      && object.amount_total === AMOUNT
      && object.currency === CURRENCY
      && object.metadata?.productId === PRODUCT_ID
      && object.metadata?.accountHash === ACCOUNT_HASH
      && object.metadata?.contextHash === CONTEXT_HASH
      && String(object.payment_intent ?? '').startsWith('pi_');
    if (!bindingOk) return { accepted: false, reason: 'PAYMENT_BINDING_INVALID' };
    const existing = state.entitlements.get(entitlementKey);
    if (!existing || !terminal(existing.status)) {
      state.entitlements.set(entitlementKey, { status: 'ACTIVE', accountHash: object.metadata.accountHash, productId: PRODUCT_ID, paymentIntent: object.payment_intent, activatedBy: parsed.id, updatedAt: now() });
    }
    state.audit.push({ action: 'checkout_completed', eventId: parsed.id, entitlementKey, status: state.entitlements.get(entitlementKey)?.status });
    return { accepted: true, bindingOk: true, entitlementStatus: state.entitlements.get(entitlementKey)?.status };
  }
  if (parsed.type === 'charge.refunded') {
    const bindingOk = object.amount === AMOUNT
      && object.amount_refunded >= AMOUNT
      && object.currency === CURRENCY
      && object.refunded === true
      && object.metadata?.productId === PRODUCT_ID
      && typeof object.metadata?.accountHash === 'string'
      && object.metadata?.contextHash === CONTEXT_HASH
      && String(object.payment_intent ?? '').startsWith('pi_');
    if (!bindingOk) return { accepted: false, reason: 'REFUND_BINDING_INVALID' };
    state.entitlements.set(entitlementKey, { status: 'REFUNDED', accountHash: object.metadata.accountHash, productId: PRODUCT_ID, paymentIntent: object.payment_intent, revokedBy: parsed.id, updatedAt: now() });
    state.audit.push({ action: 'charge_refunded', eventId: parsed.id, entitlementKey, status: 'REFUNDED' });
    return { accepted: true, bindingOk: true, entitlementStatus: 'REFUNDED' };
  }
  return { accepted: false, reason: 'UNSUPPORTED_EVENT_TYPE' };
}

function requeueDeadLetter(id, raw, correctedSignature) {
  const item = state.deadLetters.get(id);
  if (!item) return { ok: false, reason: 'DEAD_LETTER_NOT_FOUND' };
  if (item.attempts >= 1) return { ok: false, reason: 'REQUEUE_LIMIT_REACHED' };
  if (item.rawHash !== sha256Text(raw)) return { ok: false, reason: 'DEAD_LETTER_PAYLOAD_HASH_MISMATCH' };
  item.attempts += 1;
  const result = handleWebhook(raw, correctedSignature, { allowDeadLetter: false });
  if (!result.accepted) return { ok: false, reason: result.reason };
  state.deadLetters.delete(id);
  state.audit.push({ action: 'dead_letter_requeued', id, rawHash: item.rawHash, attempts: item.attempts });
  return { ok: true, result, attempts: item.attempts };
}

const cases = [];
function addCase(caseId, passed, facts, startedAt, endedAt = now()) {
  if (!REQUIRED_CASE_IDS.includes(caseId)) throw new Error(`UNEXPECTED_CASE_ID:${caseId}`);
  const row = {
    schemaVersion: 'velmere.pass36.a102r44p32.external-stripe-mock-case.v1',
    caseId,
    classification: CLASSIFICATION,
    environmentClass: 'DISPOSABLE_EXTERNAL_CI',
    expectedOutcome: 'PASS',
    observedOutcome: passed ? 'PASS' : 'FAIL',
    passed: Boolean(passed),
    startedAt,
    endedAt,
    sourceBinding: { revisionId: REVISION, sourceManifestSha256: MANIFEST_SHA, sourceAggregateSha256: AGGREGATE_SHA },
    facts,
    truthBoundary: { realStripeTestCredit: false, stripeWebhookDeliveryCredit: false, productionCredit: false, customerCredit: false, saleCredit: false, liveCredit: false },
  };
  writeJson(path.join(CASES_DIR, `${String(cases.length + 1).padStart(2, '0')}-${caseId}.json`), row);
  cases.push(row);
}

let checkout;
let paymentIntent;
let refund;
try {
  let started = now();
  checkout = await stripeRequest('/v1/checkout/sessions', {
    mode: 'payment', success_url: 'https://example.test/success', cancel_url: 'https://example.test/cancel',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][product_data][name]': 'Velmere Pro analysis mock protocol',
    'line_items[0][price_data][unit_amount]': AMOUNT,
    'line_items[0][quantity]': 1,
    'metadata[productId]': PRODUCT_ID,
    'metadata[accountHash]': ACCOUNT_HASH,
    'metadata[contextHash]': CONTEXT_HASH,
  });
  addCase('checkout-schema', checkout?.object === 'checkout.session' && String(checkout?.id ?? '').startsWith('cs_') && checkout?.livemode === false, { object: checkout?.object ?? null, idSha256: sha256Text(checkout?.id ?? ''), livemode: checkout?.livemode ?? null, apiBaseClass: 'STRIPE_MOCK_OPENAPI' }, started);

  paymentIntent = await stripeRequest('/v1/payment_intents', { amount: AMOUNT, currency: CURRENCY, 'payment_method_types[]': 'card', 'metadata[productId]': PRODUCT_ID, 'metadata[accountHash]': ACCOUNT_HASH, 'metadata[contextHash]': CONTEXT_HASH });
  const piId = String(paymentIntent?.id ?? 'pi_mock_missing');
  const sessionObject = { id: checkout.id, object: 'checkout.session', livemode: false, mode: 'payment', payment_status: 'paid', status: 'complete', amount_total: AMOUNT, currency: CURRENCY, payment_intent: piId, metadata: { productId: PRODUCT_ID, accountHash: ACCOUNT_HASH, contextHash: CONTEXT_HASH } };
  const completeEvent = event(`evt_complete_${RUN_ID}`, 'checkout.session.completed', sessionObject);
  const completeRaw = JSON.stringify(completeEvent);
  started = now();
  const signed = handleWebhook(completeRaw, signPayload(completeRaw));
  addCase('signed-webhook', signed.accepted === true && signed.bindingOk === true, { accepted: signed.accepted ?? false, signatureAlgorithm: 'HMAC_SHA256_STRIPE_STYLE_LOCAL_PROTOCOL', rawPayloadSha256: sha256Text(completeRaw), rawSignatureStored: false }, started);

  started = now();
  addCase('paymentintent-binding', signed.bindingOk === true && piId.startsWith('pi_') && sessionObject.amount_total === AMOUNT && sessionObject.currency === CURRENCY, { bindingOk: signed.bindingOk ?? false, paymentIntentIdSha256: sha256Text(piId), amount: sessionObject.amount_total, currency: sessionObject.currency, productId: PRODUCT_ID, accountHash: ACCOUNT_HASH, contextHash: CONTEXT_HASH }, started);

  const entitlementKey = `${ACCOUNT_HASH}:${PRODUCT_ID}`;
  started = now();
  addCase('entitlement-activation', state.entitlements.get(entitlementKey)?.status === 'ACTIVE', { status: state.entitlements.get(entitlementKey)?.status ?? null, entitlementKeySha256: sha256Text(entitlementKey) }, started);

  started = now();
  const duplicate = handleWebhook(completeRaw, signPayload(completeRaw));
  addCase('duplicate-idempotency', duplicate.accepted === true && duplicate.duplicate === true && state.eventHashes.size === 1, { duplicate: duplicate.duplicate ?? false, uniqueEventClaims: state.eventHashes.size, entitlementStatus: state.entitlements.get(entitlementKey)?.status ?? null }, started);

  const reorderAccountHash = sha256Text(`reorder-account:${RUN_ID}`);
  const reorderKey = `${reorderAccountHash}:${PRODUCT_ID}`;
  const reorderRefundObject = { id: `ch_reorder_${RUN_ID}`, object: 'charge', livemode: false, amount: AMOUNT, amount_refunded: AMOUNT, currency: CURRENCY, refunded: true, payment_intent: piId, metadata: { productId: PRODUCT_ID, accountHash: reorderAccountHash, contextHash: CONTEXT_HASH } };
  const reorderRefundEvent = event(`evt_reorder_refund_${RUN_ID}`, 'charge.refunded', reorderRefundObject, Math.floor(Date.now() / 1000) + 1);
  const reorderRefundRaw = JSON.stringify(reorderRefundEvent);
  started = now();
  const reorderRefund = handleWebhook(reorderRefundRaw, signPayload(reorderRefundRaw));
  const reorderCompleteObject = { ...sessionObject, id: `cs_reorder_${RUN_ID}`, metadata: { ...sessionObject.metadata, accountHash: reorderAccountHash } };
  const reorderCompleteEvent = event(`evt_reorder_complete_${RUN_ID}`, 'checkout.session.completed', reorderCompleteObject, Math.floor(Date.now() / 1000));
  const reorderCompleteRaw = JSON.stringify(reorderCompleteEvent);
  const reorderComplete = handleWebhook(reorderCompleteRaw, signPayload(reorderCompleteRaw));
  addCase('event-reorder', reorderRefund.accepted === true && reorderComplete.accepted === true && state.entitlements.get(reorderKey)?.status === 'REFUNDED', { refundAcceptedFirst: reorderRefund.accepted ?? false, completionAcceptedAfter: reorderComplete.accepted ?? false, finalStatus: state.entitlements.get(reorderKey)?.status ?? null, terminalReactivationBlocked: state.entitlements.get(reorderKey)?.status === 'REFUNDED' }, started);

  started = now();
  const tampered = JSON.stringify({ ...completeEvent, data: { object: { ...sessionObject, amount_total: AMOUNT + 1 } } });
  const replayMismatch = handleWebhook(tampered, signPayload(tampered));
  addCase('replay-denial', replayMismatch.accepted === false && replayMismatch.reason === 'EVENT_ID_PAYLOAD_MISMATCH', { accepted: replayMismatch.accepted ?? false, reason: replayMismatch.reason ?? null, originalSha256: sha256Text(completeRaw), tamperedSha256: sha256Text(tampered) }, started);

  refund = await stripeRequest('/v1/refunds', { payment_intent: piId, amount: AMOUNT, reason: 'requested_by_customer' });
  started = now();
  addCase('refund-schema', refund?.object === 'refund' && String(refund?.id ?? '').startsWith('re_') && refund?.livemode === false, { object: refund?.object ?? null, idSha256: sha256Text(refund?.id ?? ''), livemode: refund?.livemode ?? null, amount: refund?.amount ?? null, currency: refund?.currency ?? null, apiBaseClass: 'STRIPE_MOCK_OPENAPI' }, started);

  const refundObject = { id: `ch_refund_${RUN_ID}`, object: 'charge', livemode: false, amount: AMOUNT, amount_refunded: AMOUNT, currency: CURRENCY, refunded: true, payment_intent: piId, metadata: { productId: PRODUCT_ID, accountHash: ACCOUNT_HASH, contextHash: CONTEXT_HASH } };
  const refundEvent = event(`evt_refund_${RUN_ID}`, 'charge.refunded', refundObject, Math.floor(Date.now() / 1000) + 2);
  const refundRaw = JSON.stringify(refundEvent);
  started = now();
  const refundWebhook = handleWebhook(refundRaw, signPayload(refundRaw));
  addCase('refund-webhook', refundWebhook.accepted === true && refundWebhook.bindingOk === true, { accepted: refundWebhook.accepted ?? false, bindingOk: refundWebhook.bindingOk ?? false, rawPayloadSha256: sha256Text(refundRaw), rawSignatureStored: false }, started);

  started = now();
  addCase('entitlement-revocation', state.entitlements.get(entitlementKey)?.status === 'REFUNDED', { status: state.entitlements.get(entitlementKey)?.status ?? null, entitlementKeySha256: sha256Text(entitlementKey), revokedBySha256: sha256Text(state.entitlements.get(entitlementKey)?.revokedBy ?? '') }, started);

  started = now();
  const ledgerEvents = [...state.eventHashes.keys()].sort();
  const reconciled = state.entitlements.get(entitlementKey)?.status === 'REFUNDED' && ledgerEvents.includes(completeEvent.id) && ledgerEvents.includes(refundEvent.id) && state.audit.some((row) => row.action === 'checkout_completed') && state.audit.some((row) => row.action === 'charge_refunded');
  addCase('reconciliation', reconciled, { reconciled, eventClaims: ledgerEvents.length, entitlementStatus: state.entitlements.get(entitlementKey)?.status ?? null, auditRows: state.audit.length, driftCount: reconciled ? 0 : 1 }, started);

  const dlqEvent = event(`evt_dlq_${RUN_ID}`, 'checkout.session.completed', { ...sessionObject, id: `cs_dlq_${RUN_ID}` });
  const dlqRaw = JSON.stringify(dlqEvent);
  started = now();
  const dead = handleWebhook(dlqRaw, 't=1,v1=deadbeef');
  const requeue = requeueDeadLetter(dead.deadLetterId, dlqRaw, signPayload(dlqRaw));
  const secondRequeue = requeueDeadLetter(dead.deadLetterId, dlqRaw, signPayload(dlqRaw));
  addCase('controlled-dead-letter-requeue', dead.accepted === false && Boolean(dead.deadLetterId) && requeue.ok === true && secondRequeue.ok === false, { initialReason: dead.reason ?? null, deadLetterIdSha256: sha256Text(dead.deadLetterId ?? ''), firstRequeueOk: requeue.ok ?? false, firstRequeueAttempts: requeue.attempts ?? null, secondRequeueOk: secondRequeue.ok ?? false, secondRequeueReason: secondRequeue.reason ?? null, rawPayloadStored: false }, started);

  if (cases.length !== REQUIRED_CASE_IDS.length) throw new Error(`CASE_DENOMINATOR_MISMATCH:${cases.length}`);
  if (cases.some((row) => !row.passed)) throw new Error('ONE_OR_MORE_CASES_FAILED');

  const artifactRows = [];
  for (const filename of fs.readdirSync(CASES_DIR).sort()) {
    const absolute = path.join(CASES_DIR, filename);
    const bytes = fs.readFileSync(absolute);
    artifactRows.push({ path: `evidence/cases/${filename}`, byteLength: bytes.length, sha256: sha256Bytes(bytes) });
  }
  const ledger = {
    schemaVersion: 'velmere.pass36.a102r44p32.external-stripe-mock-ledger.v1',
    classification: CLASSIFICATION,
    status: 'PASS_EXTERNAL_CI_STRIPE_MOCK_PROTOCOL_12_OF_12_NO_STRIPE_TEST_CREDIT',
    required: REQUIRED_CASE_IDS.length,
    executed: cases.length,
    passed: cases.filter((row) => row.passed).length,
    failed: cases.filter((row) => !row.passed).length,
    requiredCaseIds: REQUIRED_CASE_IDS,
    observedCaseIds: cases.map((row) => row.caseId),
    sourceBinding: { revisionId: REVISION, sourceManifestSha256: MANIFEST_SHA, sourceAggregateSha256: AGGREGATE_SHA },
    externalSchemaObjects: { checkoutObject: checkout?.object ?? null, paymentIntentObject: paymentIntent?.object ?? null, refundObject: refund?.object ?? null, stripeMockApiVersion: 'v0.202.0' },
    protocolState: { uniqueEventClaims: state.eventHashes.size, entitlementRows: state.entitlements.size, deadLettersRemaining: state.deadLetters.size, auditRows: state.audit.length },
    truthBoundary: { stripeMockProtocolCredit: true, realStripeTestCredit: false, realStripeWebhookDeliveryCredit: false, realPaymentMethodCredit: false, realRefundCredit: false, stagingCredit: false, customerCredit: false, saleCredit: false, liveCredit: false },
  };
  writeJson(path.join(EVIDENCE_DIR, 'R44P32_EXTERNAL_CI_STRIPE_MOCK_LEDGER.json'), ledger);
  writeJson(path.join(EVIDENCE_DIR, 'R44P32_ARTIFACT_INDEX.json'), { schemaVersion: 'velmere.pass36.a102r44p32.external-stripe-mock-artifact-index.v1', sourceBinding: ledger.sourceBinding, classification: CLASSIFICATION, artifacts: artifactRows });
  writeJson(path.join(EVIDENCE_DIR, 'R44P32_REDACTED_PROTOCOL_AUDIT.json'), { schemaVersion: 'velmere.pass36.a102r44p32.redacted-protocol-audit.v1', classification: CLASSIFICATION, rows: state.audit.map((row) => stable(row)), rawWebhookSecretsStored: false, rawApiKeysStored: false, rawWebhookPayloadsStored: false });

  const scan = JSON.stringify({ ledger, artifactRows, audit: state.audit });
  const forbidden = [WEBHOOK_SECRET, MOCK_API_KEY, 'Authorization: Bearer', 'sk_live_', 'pk_live_'].filter((token) => scan.includes(token));
  if (forbidden.length) throw new Error(`EVIDENCE_SECRET_LEAK:${forbidden.length}`);
  process.stdout.write(JSON.stringify({ status: ledger.status, required: ledger.required, passed: ledger.passed, stripeTestCredit: false }));
} catch (error) {
  const failure = { schemaVersion: 'velmere.pass36.a102r44p32.external-stripe-mock-failure.v1', classification: CLASSIFICATION, status: 'ACTION_REQUIRED_EXTERNAL_CI_STRIPE_MOCK_FAILED', error: error instanceof Error ? error.message : String(error), completedCases: cases.map((row) => ({ caseId: row.caseId, passed: row.passed })), sourceBinding: { revisionId: REVISION, sourceManifestSha256: MANIFEST_SHA, sourceAggregateSha256: AGGREGATE_SHA }, stripeTestCredit: false, saleCredit: false, liveCredit: false };
  writeJson(path.join(EVIDENCE_DIR, 'R44P32_EXTERNAL_CI_FAILURE.json'), failure);
  throw error;
}
