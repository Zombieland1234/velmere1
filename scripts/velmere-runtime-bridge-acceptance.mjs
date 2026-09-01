import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'reports', 'PASS2124_RUNTIME_BRIDGE_ACCEPTANCE.json');
const gates = [
  { id: 'privacy-review', artifact: 'reports/PASS2120_PRIVACY_REVIEW_QUEUE_RESOLUTION.json', passStatuses: ['PASS_REVIEW_QUEUE_CLOSED', 'PASS_WITH_OWNER_REVIEW'] },
  { id: 'supabase-dry-run-plan', artifact: 'reports/PASS2121_SUPABASE_DRY_RUN_PLAN.json', passStatuses: ['STATIC_SCHEMA_OK_ENV_BLOCKED', 'READY_FOR_REMOTE_DRY_RUN'] },
  { id: 'stripe-webhook-replay-plan', artifact: 'reports/PASS2122_STRIPE_WEBHOOK_REPLAY_PLAN.json', passStatuses: ['STATIC_WEBHOOK_OK_ENV_OR_CLI_BLOCKED', 'READY_FOR_SIGNED_REPLAY'] },
  { id: 'hosted-smoke-pack', artifact: 'reports/PASS2123_HOSTED_SMOKE_PACK.json', passStatuses: ['STATIC_SMOKE_PACK_READY_BASE_URL_BLOCKED', 'READY_FOR_HOSTED_SMOKE'] },
];

const results = gates.map((gate) => {
  const fullPath = path.join(root, gate.artifact);
  if (!fs.existsSync(fullPath)) return { ...gate, status: 'blocked', actualStatus: 'MISSING_ARTIFACT', blocker: 'Run the related pass command first.' };
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const actualStatus = data.status;
  const passed = gate.passStatuses.includes(actualStatus);
  const runtimeBlocked = String(actualStatus).includes('BLOCKED');
  return {
    id: gate.id,
    artifact: gate.artifact,
    status: passed ? (runtimeBlocked ? 'blocked' : 'pass') : 'fail',
    actualStatus,
    blocker: passed && runtimeBlocked ? 'Runtime/ENV/provider evidence still required before >90%.' : passed ? null : 'Artifact status outside accepted contract.',
  };
});

const hardRuntimeGates = [
  { id: 'clean-npm-ci', status: 'blocked', command: 'nvm use 24.18.0 && npm i -g npm@11.16.0 && npm ci --no-audit --no-fund' },
  { id: 'full-typecheck', status: 'blocked', command: 'npm run typecheck' },
  { id: 'full-build', status: 'blocked', command: 'npm run build' },
  { id: 'supabase-remote-migration', status: 'blocked', command: 'supabase db push --include-all' },
  { id: 'stripe-signed-webhook-replay', status: 'blocked', command: 'stripe listen + stripe trigger checkout.session.completed' },
  { id: 'provider-sandbox-run', status: 'blocked', command: 'npm run smoke:provider-sandbox' },
  { id: 'hosted-playwright-smoke', status: 'blocked', command: 'VELMERE_SMOKE_BASE_URL=https://<vercel-url> npm run test:e2e' },
  { id: 'owner-legal-review', status: 'blocked', command: 'Review Impressum/Datenschutz/AGB/Widerruf/shipping/returns with owner/legal.' },
];

const failCount = results.filter((r) => r.status === 'fail').length;
const runtimeBlockedCount = results.filter((r) => r.status === 'blocked').length + hardRuntimeGates.length;
const report = {
  schemaVersion: 'velmere.pass2124.runtime-bridge-acceptance.v1',
  generatedAt: new Date().toISOString(),
  status: failCount ? 'FAIL' : runtimeBlockedCount ? 'STATIC_BRIDGE_PASS_RUNTIME_BLOCKED' : 'PASS_READY_ABOVE_90',
  policy: 'This bridge can prepare the jump above 90%, but it cannot claim it until hard runtime gates pass on the owner/CI environment.',
  staticBridgeGates: results,
  hardRuntimeGates,
  blockerCount: runtimeBlockedCount + failCount,
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`[pass2124] ${report.status}; blockers=${report.blockerCount}`);
if (failCount) process.exit(1);
