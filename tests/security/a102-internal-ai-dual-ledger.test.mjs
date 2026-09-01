import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const art = path.join(root, 'artifacts/closure/p34');
const run = spawnSync('python', ['scripts/closure/verify-p34-internal-ai-dual-ledger.py'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
assert.equal(run.status, 0, `verifier failed\nstdout=${run.stdout}\nstderr=${run.stderr}`);

const receipt = JSON.parse(await readFile(path.join(art, 'internal-ai-dual-ledger-verifier-receipt.json'), 'utf8'));
const summary = JSON.parse(await readFile(path.join(art, 'internal-ai-dual-ledger-summary.json'), 'utf8'));
const internalTable = JSON.parse(await readFile(path.join(art, 'P34_INTERNAL_AI_PROGRAM_TABLE.json'), 'utf8'));
const profileTable = JSON.parse(await readFile(path.join(art, 'P34_INTERNAL_AI_PROFILE_TABLE.json'), 'utf8'));
const externalTable = JSON.parse(await readFile(path.join(art, 'P34_REAL_EXTERNAL_PROGRAM_TABLE.json'), 'utf8'));
const methodology = await readFile(path.join(root, 'docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V12_INTERNAL_AI_DUAL_LEDGER_2026-08-13.txt'), 'utf8');

assert.equal(receipt.status, 'PASS');
assert.equal(receipt.internalRowsExecuted, 4017);
assert.equal(receipt.aiInternalExecutionCoveragePercent, 100);
assert.equal(receipt.externalTracksCompleted, 0);
assert.equal(receipt.realExternalExecutionCoveragePercent, 0);
assert.equal(receipt.mutationsDetected, receipt.mutationDenominator);
assert.ok(receipt.mutationDenominator >= 18);
assert.equal(summary.totalRowsExecuted, 4017);
assert.equal(summary.aiInternalExecutionCoveragePercent, 100);
assert.equal(summary.qualityResult.finalHoldoutProfilesClosed, 0);
assert.equal(summary.qualityResult.customerValueProfilesClosed, 0);
assert.equal(summary.realExternalLedger.realCustomers, 0);
assert.equal(summary.realExternalLedger.independentHumanOrOrgReviewers, 0);
assert.equal(internalTable.length, 8);
assert.ok(internalTable.every((row) => row.completionPercent === 100));
assert.ok(internalTable.every((row) => row.externalCredit === 0));
assert.equal(profileTable.length, 33);
assert.ok(profileTable.every((row) => row.customerValueCredit === false));
assert.equal(externalTable.length, 9);
assert.ok(externalTable.every((row) => row.completionPercent === 0));
assert.ok(externalTable.every((row) => row.canAiSimulationSatisfy === false));
assert.ok(methodology.includes('M24-B — TWO INDEPENDENT 100% TABLES / NO AVERAGING'));
assert.ok(methodology.includes('4017/4017 rows'));

console.log(JSON.stringify({
  status: 'PASS',
  checks: 24,
  aiInternalTable: '4017/4017 (100%)',
  realExternalTable: '0/9 (0%)',
  profilesCovered: '33/33',
  falsePromotionMutations: `${receipt.mutationsDetected}/${receipt.mutationDenominator}`,
  externalCredit: 0,
}));
