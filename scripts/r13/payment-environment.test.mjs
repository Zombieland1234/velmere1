import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRuntimePaymentAuthority } from '../../lib/checkout/runtime-payment-authority.ts';

// Synthetic mode strings, not credentials. No Stripe network request is made.
function configuredLive(extra = {}) {
  return { NODE_ENV:'production', VERCEL_ENV:'production', PAYMENTS_MODE:'live',
    STRIPE_SECRET_KEY:['sk','live','SYNTHETIC'].join('_'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:['pk','live','SYNTHETIC'].join('_'),
    STRIPE_WEBHOOK_SECRET:'synthetic_webhook_marker',
    VELMERE_RELEASE_DECISION:'GO', VELMERE_LIVE:'true', VELMERE_SALE_ENABLED:'true',
    VELMERE_PRODUCTION_APPROVED:'true', VELMERE_PROVIDER_RIGHTS_APPROVED:'true',
    VELMERE_LEGAL_APPROVED:'true', VELMERE_EXACT_RELEASE_ID:'synthetic-release',
    VELMERE_RELEASE_APPROVAL_SHA256:'a'.repeat(64), ...extra };
}
test('preview cannot inherit LIVE authority',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VERCEL_ENV:'preview'})).livePaymentsAllowed,false));
test('development cannot inherit LIVE authority',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VERCEL_ENV:'development'})).livePaymentsAllowed,false));
test('unclassified hosting cannot infer LIVE authority',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VERCEL_ENV:undefined})).livePaymentsAllowed,false));
test('test process cannot inherit production LIVE authority',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({NODE_ENV:'test'})).livePaymentsAllowed,false));
test('explicit production preserves conjunctive gates',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive()).livePaymentsAllowed,true));
test('production still rejects missing legal approval',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VELMERE_LEGAL_APPROVED:'false'})).livePaymentsAllowed,false));
test('preview allows configured TEST mode',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VERCEL_ENV:'preview',PAYMENTS_MODE:'test',STRIPE_SECRET_KEY:['sk','test','SYNTHETIC'].join('_'),NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:['pk','test','SYNTHETIC'].join('_')})).testPaymentsAllowed,true));
test('mixed modes cannot create test authority',()=>assert.equal(evaluateRuntimePaymentAuthority(configuredLive({VERCEL_ENV:'preview',PAYMENTS_MODE:'test'})).testPaymentsAllowed,false));
