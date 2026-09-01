#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

const reportOnly = process.argv.includes('--report-only');
const runHeavy = process.argv.includes('--run-heavy');
const generatedAt = new Date().toISOString();

const requiredRuntime = {
  nodeMajor: 24,
  nodeMinor: 16,
  npmMajor: 11,
  npmMinor: 16,
};

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

function npmVersion() {
  try {
    return execSync('npm -v', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function parseVersion(version) {
  const [major = '0', minor = '0', patch = '0'] = String(version).split('.');
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

function runCommand(name, command, args) {
  const startedAt = Date.now();
  const run = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32' });
  return {
    name,
    command: [command, ...args].join(' '),
    status: run.status === 0 ? 'PASS' : 'FAIL',
    exitCode: run.status,
    durationMs: Date.now() - startedAt,
    stdoutTail: (run.stdout ?? '').slice(-2500),
    stderrTail: (run.stderr ?? '').slice(-2500),
  };
}

const node = parseVersion(process.versions.node);
const npm = parseVersion(npmVersion());
const runtimeOk = node.major === requiredRuntime.nodeMajor && node.minor === requiredRuntime.nodeMinor && npm.major === requiredRuntime.npmMajor && npm.minor === requiredRuntime.npmMinor;
const installOk = existsSync('node_modules/next') && existsSync('node_modules/react') && existsSync('node_modules/typescript');
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
const missingProviderEnv = providerEnv.filter((name) => !process.env[name]);

const blockers = [];
if (!runtimeOk) blockers.push(`runtime mismatch: expected Node 24.18.0 + npm 11.16.x, got Node ${process.versions.node} + npm ${npmVersion()}`);
if (!installOk) blockers.push('clean install missing: node_modules/next/react/typescript are absent; run npm ci on a clean repo');
if (missingEnv.length) blockers.push(`P0 env missing: ${missingEnv.join(', ')}`);
if (missingProviderEnv.length) blockers.push(`provider env missing: ${missingProviderEnv.join(', ')}`);


// PASS2105-2109 hard gate static hooks: scripts/velmere-env-example-guard.mjs, scripts/velmere-lockfile-sync-gate.mjs, scripts/velmere-ts-syntax-gate.mjs, npm run typecheck:syntax
const staticGateResults = [];
for (const [name, args] of [
  ['env:example:guard', ['run', 'env:example:guard']],
  ['lockfile:sync:gate', ['run', 'lockfile:sync:gate']],
]) {
  staticGateResults.push(runCommand(name, 'npm', args));
}

const heavyResults = [];
if (runHeavy && runtimeOk && installOk) {
  heavyResults.push(runCommand('typecheck:syntax', 'npm', ['run', 'typecheck:syntax']));
  if (heavyResults.every((result) => result.status === 'PASS')) {
    heavyResults.push(runCommand('typecheck', 'npm', ['run', 'typecheck']));
  }
  if (heavyResults.every((result) => result.status === 'PASS')) {
    heavyResults.push(runCommand('build', 'npm', ['run', 'build']));
  }
  if (heavyResults.every((result) => result.status === 'PASS')) {
    heavyResults.push(runCommand('release:owner-gate', 'npm', ['run', 'release:owner-gate']));
  }
} else if (runHeavy) {
  heavyResults.push({
    name: 'heavy-gates',
    status: 'SKIPPED_BLOCKED',
    reason: 'runtime/install prerequisites failed, so typecheck/build would be dishonest noise',
  });
}

const staticGateFailed = staticGateResults.some((result) => result.status === 'FAIL');
const heavyFailed = heavyResults.some((result) => result.status === 'FAIL');
const status = blockers.length || staticGateFailed || heavyFailed ? 'BLOCKED' : 'PRODUCTION_GATE_READY';
const payload = {
  schemaVersion: 'velmere.pass2100-2104.production-hard-gate.v1',
  generatedAt,
  status,
  truthRule: 'This is the hard gate. It fails when runtime/install/env/provider prerequisites are missing. Use --report-only only for diagnostics.',
  reportOnly,
  runHeavy,
  runtime: {
    expected: 'Node 24.18.0 + npm 11.16.x',
    actual: { node: process.versions.node, npm: npmVersion() },
    ok: runtimeOk,
  },
  install: {
    hasNodeModules: existsSync('node_modules'),
    hasNext: existsSync('node_modules/next'),
    hasReact: existsSync('node_modules/react'),
    hasTypescript: existsSync('node_modules/typescript'),
    ok: installOk,
  },
  env: { requiredEnv, missingEnv, ok: missingEnv.length === 0 },
  provider: { providerEnv, missingProviderEnv, ok: missingProviderEnv.length === 0 },
  staticGateResults,
  heavyResults,
  requiredOwnerCommands: [
    'nvm use 24.18.0 || fnm use 24.18.0',
    'npm i -g npm@11.16.0',
    'rm -rf node_modules .next dist build',
    'npm ci --no-audit --no-fund --progress=false',
    'npm run typecheck:syntax',
    'npm run production:hard-gate -- --run-heavy',
    'npm run test:e2e:final',
    'npm run smoke:stripe-e2e-test-mode',
    'npm run smoke:provider-sandbox',
  ],
  blockers,
};

mkdirSync('reports', { recursive: true });
writeFileSync('reports/PASS2100_2104_PRODUCTION_HARD_GATE.json', JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
process.exit(status === 'PRODUCTION_GATE_READY' || reportOnly ? 0 : 1);
