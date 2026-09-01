#!/usr/bin/env node
import fs from 'node:fs';

const logFile = process.argv.find((arg) => arg.startsWith('--log='))?.slice('--log='.length);
const sample = process.argv.includes('--sample');
const fallbackLog = sample ? `
npm ERR! code EBADENGINE
Module not found: Can't resolve 'next'
Type error: Property 'foo' does not exist on type 'Bar'
Missing env: STRIPE_WEBHOOK_SECRET
` : '';
const log = logFile && fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : fallbackLog;

const RULES = [
  { id: 'NODE_ENGINE_MISMATCH', severity: 'P0', regex: /(EBADENGINE|Unsupported engine|node.*version|npm.*version)/i, owner: 'runtime', action: 'Use Node 24.18.0 and npm 11.16.0, then rerun npm ci.' },
  { id: 'LOCKFILE_DRIFT', severity: 'P0', regex: /(package-lock|npm ci.*can only install|EUSAGE|lock file)/i, owner: 'dependencies', action: 'Regenerate lockfile with the pinned npm version and commit package-lock.json.' },
  { id: 'MODULE_NOT_FOUND', severity: 'P0', regex: /(Module not found|Cannot find module|Can't resolve)/i, owner: 'dependencies', action: 'Identify missing package or wrong import path; avoid adding browser-only package to server boundary.' },
  { id: 'TYPESCRIPT_ERROR', severity: 'P0', regex: /(Type error|TS\d{4}|tsc.*error|Property .* does not exist)/i, owner: 'typescript', action: 'Fix source types; do not suppress with any unless a typed boundary wrapper is added.' },
  { id: 'NEXT_BUILD_ERROR', severity: 'P0', regex: /(next build|Failed to compile|Export encountered errors|Dynamic server usage)/i, owner: 'nextjs', action: 'Resolve route/config/build boundary; keep client/server env split.' },
  { id: 'ENV_MISSING', severity: 'P0', regex: /(Missing env|STRIPE_|SUPABASE_|PRINTFUL_|TAPSTITCH_|ADMIN_|WEBHOOK_SECRET)/i, owner: 'environment', action: 'Set production secrets in Vercel/GitHub; never expose non-public secrets in NEXT_PUBLIC.' },
  { id: 'PLAYWRIGHT_BROWSER_MISSING', severity: 'P1', regex: /(playwright.*install|browser executable doesn't exist|chromium)/i, owner: 'qa', action: 'Run npx playwright install --with-deps in CI before E2E.' },
];

const findings = RULES.filter((rule) => rule.regex.test(log)).map((rule) => ({
  id: rule.id,
  severity: rule.severity,
  owner: rule.owner,
  action: rule.action,
}));

const result = {
  pass: 'PASS2130',
  name: 'Build failure classifier',
  status: findings.length ? 'CLASSIFIED_BLOCKERS' : 'NO_LOG_OR_NO_KNOWN_FAILURES',
  input: logFile || (sample ? 'sample' : 'none'),
  knownRules: RULES.length,
  findings,
  promotionImpact: findings.some((f) => f.severity === 'P0') ? 'LOCKED_BELOW_90' : 'NO_NEW_LOCK',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2130_BUILD_FAILURE_CLASSIFIER.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (findings.some((f) => f.severity === 'P0') && !process.argv.includes('--report-only')) process.exitCode = 0;
