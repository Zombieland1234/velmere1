#!/usr/bin/env node
import fs from 'node:fs';
const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const missing = required.filter((key) => !process.env[key]);
const route = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8');
const checks = [
  ['raw body req.text()', route.includes('const rawBody = await req.text()')],
  ['Stripe-Signature header', route.includes('stripe-signature')],
  ['constructEvent signature verification', route.includes('stripe.webhooks.constructEvent')],
  ['idempotency ledger', route.includes('hasProcessedStripeWebhookEvent') && route.includes('markStripeWebhookEventProcessed')],
  ['durable paid write', route.includes('markDurableOrderPaid')],
  ['payment failed support', route.includes('payment_intent.payment_failed')],
  ['refund support', route.includes('charge.refunded')],
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({
  schemaVersion: 'velmere.stripe-e2e-smoke.v1',
  status: missing.length ? 'BLOCKED_ENV' : failed.length ? 'FAIL' : 'PASS_READY_FOR_TEST_MODE',
  missingEnv: missing,
  checks: checks.map(([name, ok]) => ({ name, ok })),
  productionBoundary: missing.length ? 'Set Stripe test-mode ENV and run Stripe CLI webhook simulation before claiming E2E DONE.' : 'Static contract ready. Run Stripe CLI to prove live test event processing.',
}, null, 2));
process.exit(failed.length ? 1 : 0);
