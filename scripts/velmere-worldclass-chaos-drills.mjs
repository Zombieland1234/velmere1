#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
const drills = [
  { id:'stripe-webhook-duplicate', surface:'payment', expected:'idempotent event ignored, order timeline unchanged, audit receipt written' },
  { id:'stripe-webhook-bad-signature', surface:'payment', expected:'reject request, no order mutation, safe log without raw body' },
  { id:'provider-timeout', surface:'fulfilment', expected:'retry queue item + fulfilment incident + customer-safe pending status' },
  { id:'provider-stock-mismatch', surface:'fulfilment', expected:'block fulfilment, operator incident, no customer blame copy' },
  { id:'supabase-read-fail', surface:'catalog/checkout', expected:'dev fallback only; production blocks unsafe checkout' },
  { id:'lens-source-stale', surface:'lens_pdf', expected:'missing data/source stale badge, no confident conclusion' },
  { id:'admin-role-escalation', surface:'admin', expected:'403, audit event, no write mutation' },
];
const payload = { schemaVersion:'velmere.pass2113.chaos-drill-matrix.v1', generatedAt:new Date().toISOString(), status:'STATIC_DRILL_MATRIX_READY_RUNTIME_BLOCKED', runtimeBlockedBy:['STRIPE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','PRINTFUL_API_TOKEN','admin owner session'], drills };
mkdirSync('reports',{recursive:true});
writeFileSync('reports/PASS2113_CHAOS_DRILL_MATRIX.json', JSON.stringify(payload,null,2));
console.log(JSON.stringify({drills:drills.length,status:payload.status},null,2));
