#!/usr/bin/env node
import fs from 'node:fs';

const requiredRuntime = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PRINTFUL_API_KEY',
  'ADMIN_SESSION_SECRET',
];

const commandResults = [
  {
    command: 'npm ci',
    status: 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Needs clean target runtime Node 24.18.0/npm 11.16 with registry access; sandbox cannot be counted as production proof.',
  },
  {
    command: 'npm run typecheck',
    status: 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Needs dependencies installed from npm ci before TypeScript can validate Next/React types.',
  },
  {
    command: 'npm run build',
    status: 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Must run after npm ci + typecheck in production-like environment.',
  },
  {
    command: 'stripe trigger checkout.session.completed',
    status: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET ? 'READY_TO_RUN' : 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Requires Stripe test secrets and webhook endpoint.',
  },
  {
    command: 'provider sandbox order draft',
    status: process.env.PRINTFUL_API_KEY ? 'READY_TO_RUN' : 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Requires provider sandbox/live API key and mapped test product.',
  },
  {
    command: 'playwright final production QA',
    status: 'BLOCKED_ENV_OR_RUNTIME',
    reason: 'Requires running app, browser dependencies and clean build/dev server.',
  },
];

const missingEnv = requiredRuntime.filter((key) => !process.env[key]);
const report = {
  schemaVersion: 'velmere.pass2094.final-production-candidate-smoke.v1',
  generatedAt: new Date().toISOString(),
  status: missingEnv.length === 0 ? 'READY_TO_RUN_RUNTIME_SMOKE' : 'BLOCKED_ENV_OR_RUNTIME',
  truthRule: 'This smoke does not fake a production release. It lists exact runtime gates that must pass before overall can reach 100%.',
  missingEnv,
  commandResults,
  hardBlockers: commandResults.filter((item) => item.status === 'BLOCKED_ENV_OR_RUNTIME').map((item) => `${item.command}: ${item.reason}`),
};
fs.writeFileSync('PASS2094_FINAL_PRODUCTION_CANDIDATE_SMOKE.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(0);
