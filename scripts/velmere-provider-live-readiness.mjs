#!/usr/bin/env node
import fs from 'node:fs';

function envTemplateKeys(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());
}
const keys = new Set([...envTemplateKeys('ENV_PRODUCTION_READY.example'), ...envTemplateKeys('.env.example')]);
const required = ['PRINTFUL_API_TOKEN','PRINTFUL_STORE_ID','TAPSTITCH_API_KEY'];
const missingFromTemplates = required.filter((key) => !keys.has(key));
const liveChecks = [
  'provider credentials stored only in server env',
  'sandbox order create/cancel receipt attached',
  'live provider dry-run or penny-order receipt attached',
  'shipping regions Europe/USA/international matched to provider capabilities',
  'product SKU/provider mapping not empty',
  'incident and retry ledger enabled',
  'customer-safe fulfillment status copy enabled',
];
const receiptTemplate = {
  schema: 'velmere.runtime.receipt.v1',
  gateId: 'provider',
  status: 'PASS',
  requiredFor90: true,
  source: 'provider sandbox/live workflow',
  command: 'npm run provider:sandbox:harness or provider live proof command',
  timing: { startedAt: 'YYYY-MM-DDTHH:mm:ssZ', endedAt: 'YYYY-MM-DDTHH:mm:ssZ' },
  reviewer: { name: 'owner/operator', reviewedAt: 'YYYY-MM-DDTHH:mm:ssZ' },
  result: { summary: 'Provider sandbox/live readiness passed.', exitCode: 0, artifactPath: 'reports/provider-live-proof.json' }
};
fs.mkdirSync('receipts/runtime/templates', { recursive: true });
fs.writeFileSync('receipts/runtime/templates/provider.receipt.template.json', JSON.stringify(receiptTemplate, null, 2));
fs.mkdirSync('docs/providers', { recursive: true });
fs.writeFileSync('docs/providers/PASS2159_PROVIDER_LIVE_READINESS.md', `# PASS2159 Provider Live Readiness\n\nStatus: ${missingFromTemplates.length ? 'TEMPLATE_KEYS_MISSING' : 'TEMPLATE_KEYS_READY_RUNTIME_REQUIRED'}\n\n## Required checks\n\n${liveChecks.map((item) => `- [ ] ${item}`).join('\n')}\n\n## Required ENV keys\n\n${required.map((item) => `- ${item}`).join('\n')}\n\n## Runtime receipt\n\nComplete \`receipts/runtime/provider.receipt.json\` only after a real provider proof.\n`);
const report = {
  pass: 'PASS2159',
  name: 'Provider live readiness',
  status: missingFromTemplates.length ? 'PROVIDER_TEMPLATE_KEYS_MISSING' : 'PROVIDER_LIVE_READY_STATIC_RUNTIME_RECEIPT_REQUIRED',
  requiredEnv: required,
  missingFromTemplates,
  liveChecks,
  blockers: ['Needs provider runtime receipt before >90 promotion.'],
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2159_PROVIDER_LIVE_READINESS.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, missingFromTemplates }, null, 2));
if (missingFromTemplates.length) process.exitCode = 1;
