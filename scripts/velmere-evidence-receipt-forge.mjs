#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const receipts = [
  { id: 'stripe_webhook_replay', requiredEnv: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], command: 'npm run stripe:webhook:replay:harness', runtimeStatus: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET ? 'READY_TO_RUN' : 'BLOCKED_ENV' },
  { id: 'provider_sandbox', requiredEnv: ['PRINTFUL_API_TOKEN', 'PRINTFUL_STORE_ID', 'TAPSTITCH_API_KEY'], command: 'npm run provider:sandbox:harness', runtimeStatus: process.env.PRINTFUL_API_TOKEN || process.env.TAPSTITCH_API_KEY ? 'READY_TO_RUN' : 'BLOCKED_PROVIDER_ENV' },
  { id: 'supabase_remote', requiredEnv: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], command: 'npm run supabase:remote:checklist', runtimeStatus: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'READY_TO_RUN' : 'BLOCKED_ENV' },
  { id: 'hosted_smoke', requiredEnv: ['VELMERE_HOSTED_BASE_URL'], command: 'npm run smoke:hosted-pack', runtimeStatus: process.env.VELMERE_HOSTED_BASE_URL ? 'READY_TO_RUN' : 'BLOCKED_HOSTED_URL' },
];
for (const r of receipts) {
  r.claimPolicy = 'customer-safe: no raw secrets, no raw PII, no provider payload leakage';
  r.receiptHash = crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex');
}
const result = {
  pass: 'PASS2133',
  name: 'Evidence receipt forge',
  status: receipts.every((r) => r.runtimeStatus === 'READY_TO_RUN') ? 'READY_RUNTIME' : 'RECEIPTS_READY_RUNTIME_BLOCKED',
  receipts,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2133_EVIDENCE_RECEIPTS.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
