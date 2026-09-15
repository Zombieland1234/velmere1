import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertStripeClientEnvironment } from '../../lib/checkout/runtime-payment-authority.ts';
const key=(mode,prefix='sk')=>[prefix,mode,'SYNTHETIC'].join('_');
test('LIVE secret cannot instantiate in preview',()=>assert.throws(()=>assertStripeClientEnvironment({VERCEL_ENV:'preview',NODE_ENV:'production',STRIPE_SECRET_KEY:key('live')}),/forbidden/));
test('restricted LIVE credential is blocked too',()=>assert.throws(()=>assertStripeClientEnvironment({VERCEL_ENV:'preview',NODE_ENV:'production',STRIPE_SECRET_KEY:key('live','rk')}),/forbidden/));
test('TEST credential can instantiate in preview',()=>assert.doesNotThrow(()=>assertStripeClientEnvironment({VERCEL_ENV:'preview',NODE_ENV:'production',STRIPE_SECRET_KEY:key('test')})));
test('client call site checks before cache and constructor (source contract, not SDK execution)',async()=>{const s=await readFile(new URL('../../lib/stripe/server.ts',import.meta.url),'utf8');assert.ok(s.indexOf('assertStripeClientEnvironment();')<s.indexOf('if (!cachedStripe'));assert.ok(s.includes('from "@/lib/checkout/runtime-payment-authority"'));});
