#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const gates = [
  { id: 'clean_install', source: 'local_or_github_actions', command: 'npm ci --no-audit --no-fund --progress=false', requiredFor90: true },
  { id: 'typecheck', source: 'local_or_github_actions', command: 'npm run typecheck', requiredFor90: true },
  { id: 'build', source: 'vercel_or_github_actions', command: 'npm run build', requiredFor90: true },
  { id: 'supabase', source: 'supabase_cli_or_sql_editor', command: 'apply lib/db/schema.sql and export schema proof', requiredFor90: true },
  { id: 'stripe', source: 'stripe_cli', command: 'stripe trigger checkout.session.completed with signed webhook', requiredFor90: true },
  { id: 'provider', source: 'printful_or_tapstitch_sandbox', command: 'npm run provider:sandbox:harness with sandbox credentials', requiredFor90: true },
  { id: 'hosted_smoke', source: 'hosted_browser_smoke', command: 'npm run smoke:hosted-pack with VELMERE_HOSTED_BASE_URL', requiredFor90: true },
  { id: 'admin_auth', source: 'signed_admin_session_smoke', command: 'admin signed session smoke with VELMERE_ADMIN_SESSION_SECRET', requiredFor90: true },
  { id: 'legal_owner_review', source: 'owner_review', command: 'owner confirms Impressum/Datenschutz/AGB/Widerruf/shipping/returns', requiredFor90: true },
];

function templateFor(gate) {
  return {
    schema: 'velmere.runtime.receipt.v1',
    gateId: gate.id,
    source: gate.source,
    status: 'REPLACE_WITH_PASS_OR_FAIL',
    requiredFor90: gate.requiredFor90,
    command: gate.command,
    environment: {
      node: 'REPLACE_WITH_NODE_VERSION',
      npm: 'REPLACE_WITH_NPM_VERSION',
      target: 'local|github_actions|vercel|supabase|stripe|provider|hosted|owner'
    },
    timing: {
      startedAt: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      endedAt: 'YYYY-MM-DDTHH:mm:ss.sssZ'
    },
    result: {
      exitCode: null,
      summary: 'Paste short human summary here',
      artifactPath: 'reports/or/external/url/or/ci/artifact/path',
      redactedLogPath: 'reports/redacted-log.txt',
      sha256: 'optional_sha256_of_artifact_or_log'
    },
    reviewer: {
      owner: 'Marcin Bajak / Velmère',
      reviewedAt: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      note: 'No secrets, no PII in attached artifact.'
    }
  };
}

fs.mkdirSync('docs/runtime/receipts', { recursive: true });
fs.mkdirSync('receipts/runtime', { recursive: true });
fs.mkdirSync('reports', { recursive: true });

for (const gate of gates) {
  const file = path.join('docs/runtime/receipts', `${gate.id}.receipt.template.json`);
  fs.writeFileSync(file, JSON.stringify(templateFor(gate), null, 2));
}

const guide = `# Velmère PASS2148 Runtime Receipt Templates\n\nThese templates are intentionally not marked as PASS. Copy a template from \`docs/runtime/receipts/*.template.json\`, fill it with real evidence, then place the filled receipt in \`receipts/runtime/<gateId>.receipt.json\`.\n\nRequired gates for promotion above 90%:\n\n${gates.map((g) => `- **${g.id}** — ${g.command}`).join('\n')}\n\nRules:\n- Never paste secrets or raw customer PII into receipts.\n- Keep logs redacted.\n- A placeholder template never unlocks promotion.\n- A receipt must use status \`PASS\`, exitCode \`0\` where applicable, and a non-placeholder reviewedAt timestamp.\n`;
fs.writeFileSync('docs/runtime/RUNTIME_RECEIPT_ATTACH_GUIDE_PASS2148.md', guide);

const result = {
  pass: 'PASS2148',
  name: 'Runtime receipt templates',
  status: 'TEMPLATES_READY_REAL_RECEIPTS_REQUIRED',
  templates: gates.map((gate) => ({ gateId: gate.id, template: `docs/runtime/receipts/${gate.id}.receipt.template.json` })),
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync('reports/PASS2148_RUNTIME_RECEIPT_TEMPLATES.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, templates: result.templates.length }, null, 2));
