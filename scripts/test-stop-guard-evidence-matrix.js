const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join('.agents', 'state', 'velmere-progress.json');
const COUNTER_FILE = path.join('.agents', 'hooks', '.pass-counter.json');

function callGuard(payload) {
  const stdin = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const out = execSync('node .agents/hooks/stop-guard.js', {
    input: stdin,
    encoding: 'utf8'
  }).trim();
  return JSON.parse(out);
}

function resetCounter() {
  if (fs.existsSync(COUNTER_FILE)) fs.unlinkSync(COUNTER_FILE);
}

const originalProgress = fs.readFileSync(PROGRESS_FILE, 'utf8');
const results = [];

// Test 1: Self-declared boolean true without evidence
resetCounter();
const selfDeclaredTrue = {
  majorProductsValidated: true,
  negativePathsValidated: true,
  tierBoundariesValidated: true,
  securityMatrixValidated: true,
  databaseValidated: true,
  paymentsValidated: true,
  pdfValidated: true,
  smartContractsValidated: true,
  providerTruthValidated: true,
  angelAdversarialValidated: true,
  customer100Validated: true,
  secondPassCompleted: true,
  thirdHighRiskPassCompleted: true,
  finalRegressionCompleted: true,
  freshDiscoveryCompleted: true,
  internalBlockersRemaining: false
};
fs.writeFileSync(PROGRESS_FILE, JSON.stringify(selfDeclaredTrue, null, 2), 'utf8');
const r1 = callGuard({ terminationReason: 'model_stop' });
results.push({
  name: '1. Self-declared boolean true rejected (requires real evidence)',
  passed: r1.decision === 'continue' && r1.reason.includes('uzywa wylacznie deklaratywnego'),
  output: r1
});

// Test 2: Evidence pointing to non-existent file
resetCounter();
const nonExistentEvidence = {
  customer100Validated: {
    status: 'verified',
    evidence: ['artifacts/customer-campaign/NON_EXISTENT_RECEIPT_123.json']
  },
  internalBlockersRemaining: false
};
fs.writeFileSync(PROGRESS_FILE, JSON.stringify(nonExistentEvidence, null, 2), 'utf8');
const r2 = callGuard({ terminationReason: 'model_stop' });
results.push({
  name: '2. Non-existent evidence file rejected',
  passed: r2.decision === 'continue' && (r2.reason.includes('brak pliku dowodowego') || r2.reason.includes('niekompletny')),
  output: r2
});

// Test 3: System errors allow stop
resetCounter();
const r3_err = callGuard({ terminationReason: 'error' });
const r3_can = callGuard({ terminationReason: 'cancelled' });
const r3_max = callGuard({ terminationReason: 'max_steps_exceeded' });
results.push({
  name: '3. System errors allowed (error/cancelled/max_steps_exceeded)',
  passed: r3_err.decision === 'allow' && r3_can.decision === 'allow' && r3_max.decision === 'allow',
  output: { error: r3_err, cancelled: r3_can, max_steps: r3_max }
});

// Test 4: Real evidence files correctly accepted by verifier
resetCounter();
const realEvidenceState = {
  majorProductsValidated: { status: 'verified', evidence: ['artifacts/customer-campaign/TRUE-PRODUCT-V3-2026-09-01T23-08-48-776Z.json'] },
  negativePathsValidated: { status: 'verified', evidence: ['artifacts/customer-campaign/TRUE-PRODUCT-V3-2026-09-01T23-08-48-776Z.json'] },
  tierBoundariesValidated: { status: 'verified', evidence: ['config/pass36/a84-test-receipt.json'] },
  securityMatrixValidated: { status: 'verified', evidence: ['config/pass36/a65-external-command-trust-boundary-test-receipt.json'] },
  databaseValidated: { status: 'verified', evidence: ['config/pass36/a73-cookie-session-boundary-test-receipt.json'] },
  paymentsValidated: { status: 'verified', evidence: ['config/pass36/a102r40-local-regression-receipt.json'] },
  pdfValidated: { status: 'verified', evidence: ['artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_QA_RECEIPT.json'] },
  smartContractsValidated: { status: 'verified', evidence: ['config/pass36/a82-test-receipt.json'] },
  providerTruthValidated: { status: 'verified', evidence: ['config/pass36/a86-test-receipt.json'] },
  angelAdversarialValidated: { status: 'verified', evidence: ['config/pass36/a88-test-receipt.json'] },
  customer100Validated: { status: 'verified', evidence: ['artifacts/customer-campaign/TRUE-PRODUCT-V3-2026-09-01T23-08-48-776Z.json'] },
  secondPassCompleted: { status: 'verified', evidence: ['artifacts/release/SBOM.cdx.json'] },
  thirdHighRiskPassCompleted: { status: 'verified', evidence: ['artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json'] },
  finalRegressionCompleted: { status: 'verified', evidence: ['config/pass36/a102r41-next-tracing-and-build-receipt-denominator-migration.json'] },
  freshDiscoveryCompleted: { status: 'verified', evidence: ['config/pass36/a88r1-test-receipt.json'] },
  internalBlockersRemaining: false
};
fs.writeFileSync(PROGRESS_FILE, JSON.stringify(realEvidenceState, null, 2), 'utf8');
const r4 = callGuard({ terminationReason: 'model_stop' });
results.push({
  name: '4. Real evidence validated (Pass 1 continues for thoroughness)',
  passed: r4.decision === 'continue' && r4.reason.includes('Pass 1/8'),
  output: r4
});

// Test 5: Anti-infinite-loop safety limit reached at pass 9
let countPasses = 0;
let reachedLimit = false;
let limitMsg = '';
for (let i = 1; i <= 9; i++) {
  const r = callGuard({ terminationReason: 'model_stop' });
  if (r.decision === 'continue') countPasses++;
  if (r.decision === 'allow' && r.reason.includes('SAFETY LIMIT REACHED')) {
    reachedLimit = true;
    limitMsg = r.reason;
  }
}
results.push({
  name: '5. Anti-infinite-loop safety limit reached after 8 passes (does not claim completion)',
  passed: countPasses === 7 && reachedLimit,
  output: { totalContinues: countPasses + 1, reachedLimit, limitMsg }
});

// Restore original progress file & clean counter
fs.writeFileSync(PROGRESS_FILE, originalProgress, 'utf8');
resetCounter();

console.log('=== EVIDENCE-AWARE STOP GUARD TEST RESULTS ===');
results.forEach(r => {
  console.log((r.passed ? '✓ PASS: ' : '✗ FAIL: ') + r.name);
  console.log('   Detail:', JSON.stringify(r.output).slice(0, 140) + '...');
});

const allPassed = results.every(r => r.passed);
console.log('SUMMARY: ALL ' + results.length + ' EVIDENCE TESTS PASSED:', allPassed);
if (!allPassed) process.exit(1);
