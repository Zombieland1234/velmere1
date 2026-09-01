import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'VELMERE_ADMIN_SESSION_SECRET',
  'VELMERE_ADMIN_OWNER_EMAILS',
];

const providerEnv = ['PRINTFUL_API_TOKEN', 'PRINTFUL_STORE_ID', 'TAPSTITCH_API_KEY'];

const nodeVersion = process.versions.node;
let npmVersion = 'unknown';
try {
  npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
} catch (ignoredError) { void ignoredError; }

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
const missingProvider = providerEnv.filter((name) => !process.env[name]);
const runtimeOk = /^24\.16\./.test(nodeVersion) && /^11\.16\./.test(npmVersion);
const installOk = existsSync('node_modules') && existsSync('node_modules/next') && existsSync('node_modules/react');

const blockers = [];
if (!runtimeOk) blockers.push(`runtime: expected Node 24.18.0 + npm 11.16.x, got Node ${nodeVersion} + npm ${npmVersion}`);
if (!installOk) blockers.push('install: node_modules/next/react missing; run clean npm ci before claiming typecheck/build proof');
if (missingEnv.length) blockers.push(`env: missing P0 variables ${missingEnv.join(', ')}`);
if (missingProvider.length) blockers.push(`provider: missing provider variables ${missingProvider.join(', ')}`);

const payload = {
  schemaVersion: 'velmere.pass2095-2099.owner-production-blockers.v1',
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'BLOCKED' : 'READY_FOR_OWNER_RUNTIME_SMOKE',
  truthRule: 'This command reports blockers. It must not be converted into DONE unless clean npm ci/typecheck/build and live/sandbox integration smokes pass.',
  runtime: { nodeVersion, npmVersion, runtimeOk },
  install: { hasNodeModules: existsSync('node_modules'), hasNext: existsSync('node_modules/next'), installOk },
  missingEnv,
  missingProvider,
  nextRequiredCommands: [
    'npm ci --no-audit --no-fund --progress=false',
    'npm run typecheck',
    'npm run build',
    'npm run release:owner-gate',
    'stripe trigger checkout.session.completed',
    'npm run smoke:provider-sandbox',
    'npm run test:e2e:final',
  ],
  blockers,
};

mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2095_2099_OWNER_PRODUCTION_BLOCKERS.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
