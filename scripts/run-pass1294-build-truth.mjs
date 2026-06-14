import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const fullMode = process.env.VELMERE_FULL_BUILD_TRUTH === '1';
const artifactDir = 'test-results/pass1294-build-truth';
mkdirSync(artifactDir, { recursive: true });

const commands = fullMode
  ? [
      ['node-version', 'npx', ['-p', 'node@24.16.0', '-p', 'npm@11.16.0', '-c', 'node -v && npm -v']],
      ['install', 'npx', ['-p', 'node@24.16.0', '-p', 'npm@11.16.0', '-c', 'npm ci --no-audit --no-fund --progress=false']],
      ['typecheck', 'npm', ['run', 'typecheck']],
      ['lint', 'npm', ['run', 'lint']],
      ['build', 'npm', ['run', 'build']],
    ]
  : [
      ['node-version', 'node', ['-v']],
      ['npm-version', 'npm', ['-v']],
      ['i18n', 'npm', ['run', 'check:i18n']],
      ['preflight', 'npm', ['run', 'vercel:preflight']],
      ['route-smoke', 'npm', ['run', 'smoke:routes:static']],
      ['pass1274-verifier', 'npm', ['run', 'verify:pass1274-1293-runtime-visual-qa']],
      ['artifact-pending-proof', 'npm', ['run', 'verify:e2e:pass1274-1293-artifacts:pending']],
    ];

const results = [];
for (const [id, cmd, args] of commands) {
  const startedAt = new Date().toISOString();
  const run = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  const endedAt = new Date().toISOString();
  const out = `${run.stdout || ''}${run.stderr || ''}`.trim();
  writeFileSync(join(artifactDir, `${id}.log`), out + '\n');
  results.push({ id, command: [cmd, ...args].join(' '), status: run.status === 0 ? 'pass' : 'fail', exitCode: run.status, startedAt, endedAt, log: `${id}.log` });
  if (run.status !== 0) break;
}

const payload = {
  id: 'pass1294-build-truth-runtime-artifacts-gate',
  mode: fullMode ? 'full-build-truth' : 'sandbox-safe-static-proof',
  completedAt: new Date().toISOString(),
  rule: 'Full 100% remains blocked until full install/typecheck/lint/build and Playwright artifacts pass on Node 24/npm 11.',
  results,
};
writeFileSync(join(artifactDir, 'summary.json'), JSON.stringify(payload, null, 2) + '\n');

const failed = results.find((result) => result.status !== 'pass');
if (failed) {
  console.error(`PASS1294 build truth runner failed at ${failed.id}; see ${artifactDir}/${failed.log}`);
  process.exit(1);
}
console.log(`PASS1294 build truth runner passed in ${payload.mode}; summary: ${artifactDir}/summary.json`);
