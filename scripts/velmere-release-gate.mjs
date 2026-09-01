#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const checks = [
  ['env:validate', ['npm', ['run', 'env:validate']]],
  ['check:i18n', ['npm', ['run', 'check:i18n']]],
  ['vercel:preflight', ['npm', ['run', 'vercel:preflight']]],
  ['verify:shield', ['npm', ['run', 'verify:shield']]],
  ['verify:shield-design', ['npm', ['run', 'verify:shield-design']]],
  ['verify:secret-redaction-static', ['npm', ['run', 'verify:secret-redaction-static']]],
  ['verify:pass2070-2074-topka-foundation', ['npm', ['run', 'verify:pass2070-2074-topka-foundation']]],
  ['verify:pass2075-2079-topka-truth', ['npm', ['run', 'verify:pass2075-2079-topka-truth']]],
  ['smoke:stripe-e2e-test-mode', ['npm', ['run', 'smoke:stripe-e2e-test-mode']]],
  ['smoke:provider-sandbox', ['npm', ['run', 'smoke:provider-sandbox']]],
  ['verify:pass2080-2084-security-operator', ['npm', ['run', 'verify:pass2080-2084-security-operator']]],
  ['verify:pass2085-2088-topka-ux', ['npm', ['run', 'verify:pass2085-2088-topka-ux']]],
  ['verify:pass2089-2094-final-readiness', ['npm', ['run', 'verify:pass2089-2094-final-readiness']]],
  ['smoke:final-production-candidate', ['npm', ['run', 'smoke:final-production-candidate']]],
  ['release:runtime-receipt-lane', ['npm', ['run', 'release:runtime-receipt-lane']]],
  ['verify:pass2145-2149-runtime-receipt-attach', ['npm', ['run', 'verify:pass2145-2149-runtime-receipt-attach']]],
];

const results = [];
for (const [name, [cmd, args]] of checks) {
  const startedAt = Date.now();
  const run = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32' });
  results.push({
    name,
    status: run.status === 0 ? 'PASS' : 'FAIL',
    exitCode: run.status,
    durationMs: Date.now() - startedAt,
    stdoutTail: (run.stdout ?? '').slice(-1200),
    stderrTail: (run.stderr ?? '').slice(-1200),
  });
}

const failed = results.filter((result) => result.status !== 'PASS');
const report = {
  schemaVersion: 'velmere.release.gate.v1',
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  hardNote: 'This gate validates static/security/project contracts. Full npm ci, typecheck, next build, Stripe E2E and provider sandbox still require a clean environment with ENV/secrets.',
  results,
};
fs.writeFileSync('VELMERE_RELEASE_GATE_RESULT.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
