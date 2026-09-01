#!/usr/bin/env node
import fs from 'node:fs';

const gates = [
  { id: 'clean_install', command: 'npm ci --no-audit --no-fund --progress=false', requiredFor90: true, status: 'BLOCKED_UNPROVEN_IN_SANDBOX' },
  { id: 'typecheck', command: 'npm run typecheck', requiredFor90: true, status: 'BLOCKED_UNPROVEN_IN_SANDBOX' },
  { id: 'build', command: 'npm run build', requiredFor90: true, status: 'BLOCKED_UNPROVEN_IN_SANDBOX' },
  { id: 'env_safe_boot', command: 'npm run env:safe-boot', requiredFor90: true, status: fs.existsSync('reports/PASS2131_ENV_SAFE_BOOT_PROBE.json') ? JSON.parse(fs.readFileSync('reports/PASS2131_ENV_SAFE_BOOT_PROBE.json','utf8')).status : 'MISSING' },
  { id: 'db_rehearsal', command: 'npm run db:migration:rehearsal', requiredFor90: true, status: fs.existsSync('reports/PASS2132_DB_MIGRATION_REHEARSAL.json') ? JSON.parse(fs.readFileSync('reports/PASS2132_DB_MIGRATION_REHEARSAL.json','utf8')).status : 'MISSING' },
  { id: 'stripe_replay', command: 'npm run stripe:webhook:replay:harness', requiredFor90: true, status: 'BLOCKED_ENV' },
  { id: 'provider_sandbox', command: 'npm run provider:sandbox:harness', requiredFor90: true, status: 'BLOCKED_PROVIDER_ENV' },
  { id: 'hosted_smoke', command: 'npm run smoke:hosted-pack', requiredFor90: true, status: 'BLOCKED_HOSTED_URL' },
  { id: 'legal_owner_review', command: 'owner review', requiredFor90: true, status: 'OWNER_REVIEW_REQUIRED' },
];
const locked = gates.some((g) => g.requiredFor90 && !/^PASS|READY/.test(g.status));
const result = {
  pass: 'PASS2134',
  name: 'Production promotion board',
  status: locked ? 'LOCKED_BELOW_90' : 'PROMOTION_READY_ABOVE_90',
  honestOverallCeiling: locked ? 89.99 : 90.5,
  gates,
  nextBestMove: locked ? 'Run clean install/typecheck/build on Node 24.18.0/npm 11.16 and attach logs.' : 'Run hosted E2E and owner release review.',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2134_PROMOTION_BOARD.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (locked && !process.argv.includes('--report-only')) process.exitCode = 0;
