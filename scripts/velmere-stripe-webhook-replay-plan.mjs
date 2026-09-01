import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputPath = path.join(root, 'reports', 'PASS2122_STRIPE_WEBHOOK_REPLAY_PLAN.json');
const webhookRoute = path.join(root, 'app', 'api', 'stripe', 'webhook', 'route.ts');
const routeSource = fs.existsSync(webhookRoute) ? fs.readFileSync(webhookRoute, 'utf8') : '';
const stripeCli = spawnSync('stripe', ['--version'], { encoding: 'utf8' });
const requiredMarkers = [
  'constructEvent',
  'Stripe-Signature',
  'stripe-signature',
  'await req.text()',
  'checkout.session.completed',
];
const missingMarkers = requiredMarkers.filter((marker) => !routeSource.includes(marker));
const env = {
  STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
};
const envReady = Object.values(env).every(Boolean);
const cliReady = stripeCli.status === 0;
const status = missingMarkers.length ? 'BLOCKED_WEBHOOK_CONTRACT' : envReady && cliReady ? 'READY_FOR_SIGNED_REPLAY' : 'STATIC_WEBHOOK_OK_ENV_OR_CLI_BLOCKED';
const report = {
  schemaVersion: 'velmere.pass2122.stripe-webhook-replay-plan.v1',
  generatedAt: new Date().toISOString(),
  status,
  route: 'app/api/stripe/webhook/route.ts',
  requiredMarkers,
  missingMarkers,
  env,
  stripeCli: { available: cliReady, stdout: stripeCli.stdout?.trim() ?? '', stderr: stripeCli.stderr?.trim() ?? '' },
  replayCommands: [
    'stripe listen --forward-to localhost:3000/api/stripe/webhook',
    'stripe trigger checkout.session.completed',
    'stripe trigger payment_intent.payment_failed',
    'stripe trigger charge.refunded',
    'npm run smoke:stripe-e2e-test-mode',
  ],
  acceptance: [
    'Webhook rejects unsigned payloads.',
    'Webhook accepts Stripe-signed replay.',
    'checkout.session.completed creates/updates durable order state.',
    'Duplicate event id is idempotent.',
    'No raw customer PII, secrets, or raw provider payloads are logged.',
  ],
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`[pass2122] ${status}; missingMarkers=${missingMarkers.length}; envReady=${envReady}; stripeCli=${cliReady}`);
if (missingMarkers.length) process.exit(1);
