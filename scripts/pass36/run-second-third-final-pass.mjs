import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

fs.mkdirSync('artifacts/regression', { recursive: true });

console.log('--- EXECUTING SECOND PASS ---');
const t0 = Date.now();
const a84Out = execSync('node --experimental-strip-types scripts/pass36/verify-a84-shield-full-catalog-tier-matrix.ts', { encoding: 'utf8' });
const envOut = execSync('node scripts/pass35/test-audit-execution-envelope.mjs', { encoding: 'utf8' });

const secondPassReceipt = {
  schemaVersion: 'velmere.second-pass.receipt.v1',
  executedAt: new Date().toISOString(),
  durationMs: Date.now() - t0,
  a84Status: a84Out.includes('PASS_A84_LOCAL_SHIELD_FULL_CATALOG_VERIFICATION') ? 'PASS' : 'FAIL',
  envelopeStatus: envOut.includes('status": "PASS"') ? 'PASS' : 'FAIL',
  passed: a84Out.includes('PASS_A84') && envOut.includes('status": "PASS"')
};
fs.writeFileSync('artifacts/regression/SECOND_PASS_RECEIPT.json', JSON.stringify(secondPassReceipt, null, 2), 'utf8');
console.log('Second pass completed: ' + secondPassReceipt.passed);

console.log('--- EXECUTING THIRD HIGH-RISKS_PASS ---');
const t1 = Date.now();
const containmentOut = execSync('node scripts/pass36/test-a102r41-external-command-containment-and-tool-spec.mjs', { encoding: 'utf8' });
const forgeOut = execSync('node scripts/pass35/test-audit-a6-forge-adapter.mjs', { encoding: 'utf8' });

const thirdPassReceipt = {
  schemaVersion: 'velmere.third-high-risk-pass.receipt.v1',
  executedAt: new Date().toISOString(),
  durationMs: Date.now() - t1,
  containmentChecks: containmentOut.includes('passed": 11') ? 'PASS' : 'FAIL',
  forgeChecks: forgeOut.includes('PASS_AUDIT_A6_FORGE_ADAPTER') ? 'PASS' : 'FAIL',
  passed: containmentOut.includes('passed": 11') && forgeOut.includes('PASS_AUDIT_A6_FORGE_ADAPTER')
};
fs.writeFileSync('artifacts/regression/THIRD_HIGH_RISK_PASS_RECEIPT.json', JSON.stringify(thirdPassReceipt, null, 2), 'utf8');
console.log('Third high-risk pass completed: ' + thirdPassReceipt.passed);

console.log('--- EXECUTING FINAL REGRESSION PASS ---');
const t2 = Date.now();
const a88Out = execSync('node --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/verify-a88-brain-angel-risk-eval.ts', { encoding: 'utf8' });

const finalRegReceipt = {
  schemaVersion: 'velmere.final-regression.receipt.v1',
  executedAt: new Date().toISOString(),
  durationMs: Date.now() - t2,
  a88Evaluations: a88Out.includes('passed": 61') || a88Out.includes('passed": true') ? 'PASS' : 'FAIL',
  passed: a88Out.includes('VELMERE_PASS36_A88')
};
fs.writeFileSync('artifacts/regression/FINAL_REGRESSION_RECEIPT.json', JSON.stringify(finalRegReceipt, null, 2), 'utf8');
console.log('Final regression pass completed: ' + finalRegReceipt.passed);

console.log('--- EXECUTING FRESH DISCOVERY PASS ---');
const t3 = Date.now();
const secRedOut = execSync('node scripts/pass36/verify-security-and-negative-paths.mjs', { encoding: 'utf8' });
const freshDiscoveryReceipt = {
  schemaVersion: 'velmere.fresh-discovery.receipt.v1',
  executedAt: new Date().toISOString(),
  durationMs: Date.now() - t3,
  probesVerified: secRedOut.includes('Saved security receipt'),
  passed: secRedOut.includes('Saved security receipt')
};
fs.writeFileSync('artifacts/regression/FRESH_DISCOVERY_RECEIPT.json', JSON.stringify(freshDiscoveryReceipt, null, 2), 'utf8');
console.log('Fresh discovery pass completed: ' + freshDiscoveryReceipt.passed);
