#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const steps = [
  ['runtime:receipt:templates', ['npm', ['run', 'runtime:receipt:templates']]],
  ['runtime:receipt:attach', ['npm', ['run', 'runtime:receipt:attach']]],
  ['runtime:receipt:validate', ['npm', ['run', 'runtime:receipt:validate']]],
  ['promotion:unlock:evaluate', ['npm', ['run', 'promotion:unlock:evaluate']]],
];
const results = [];
for (const [id, [cmd, args]] of steps) {
  const run = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  results.push({ id, exitCode: run.status ?? 0, stdout: run.stdout.slice(-4000), stderr: run.stderr.slice(-4000) });
}
const failed = results.filter((r) => r.exitCode !== 0);
const unlock = (() => { try { return JSON.parse(fs.readFileSync('reports/PASS2147_PROMOTION_UNLOCK_EVALUATOR.json', 'utf8')); } catch { return null; } })();
const result = {
  pass: 'PASS2149',
  name: 'Runtime receipt release lane',
  status: failed.length ? 'FAIL' : 'PASS_STATIC_RUNTIME_RECEIPTS_REQUIRED',
  canPromoteAbove90: Boolean(unlock?.canPromoteAbove90),
  honestOverallCeiling: unlock?.honestOverallCeiling ?? 89.995,
  steps: results,
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/PASS2149_RUNTIME_RECEIPT_LANE.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, canPromoteAbove90: result.canPromoteAbove90, ceiling: result.honestOverallCeiling }, null, 2));
if (failed.length) process.exit(1);
