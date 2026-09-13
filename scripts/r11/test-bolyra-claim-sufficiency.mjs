import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateReceiptCompletenessClaim, sha256 } from './claim-sufficiency-engine.mjs';

const VELMERE_SOURCE_SHA = 'c9e194e21804c55c27ccecfac537814d62a66493';
const VELMERE_TREE_SHA = 'a5f88edfdf21848c9f7734d21e047df5b8be320e';

const receipts = [
  { id: 'R0', hash: '0xaaa0', previousHash: null },
  { id: 'R1', hash: '0xaaa1', previousHash: '0xaaa0' },
  { id: 'R2', hash: '0xaaa2', previousHash: '0xaaa1' },
];

const claim = {
  id: 'BOLYRA-COMPLETENESS-001',
  type: 'COMPLETE_RECEIPT_HISTORY_THROUGH_CHECKPOINT',
  statement: 'The presented receipt log is the complete authoritative receipt history through checkpoint C.',
};

const baseEvidence = {
  source: {
    provider: 'Bolyra public receipt/verifier model',
    mode: 'synthetic methodology case using public behavior; no proprietary or customer data',
  },
  presentedReceiptSet: {
    count: receipts.length,
    headHash: receipts.at(-1).hash,
    receiptSetDigestSha256: sha256(receipts),
  },
  receiptVerification: {
    ok: true,
    meaning: 'Presented receipts are treated as a structurally valid chain/prefix for this synthetic test.',
  },
  signerTrust: {
    independentlyTrusted: true,
    basis: 'synthetic trusted-signer input for isolating the completeness question',
  },
};

const policy = {
  requireTrustedSignerForAuthoritativeHistory: true,
};

const cases = [
  {
    id: 'CASE_A_VALID_PREFIX_NO_TRUSTED_CHECKPOINT_EXPECTATION',
    expected: { status: 'UNKNOWN', sufficiency: 'NOT_SUFFICIENT_FOR_CLAIM' },
    evidence: {
      ...baseEvidence,
      checkpointExpectation: {
        expectedCount: null,
        expectedHeadHash: null,
        provenanceTrusted: false,
      },
    },
  },
  {
    id: 'CASE_B_TRUSTED_COUNT_MATCHES',
    expected: { status: 'SUPPORTED', sufficiency: 'SUFFICIENT_FOR_CLAIM' },
    evidence: {
      ...baseEvidence,
      checkpointExpectation: {
        expectedCount: 3,
        expectedHeadHash: null,
        provenanceTrusted: true,
      },
    },
  },
  {
    id: 'CASE_C_TRUSTED_COUNT_SAYS_ONE_RECEIPT_IS_MISSING',
    expected: { status: 'CONTRADICTED', sufficiency: 'NOT_SUFFICIENT_FOR_CLAIM' },
    evidence: {
      ...baseEvidence,
      checkpointExpectation: {
        expectedCount: 4,
        expectedHeadHash: null,
        provenanceTrusted: true,
      },
    },
  },
  {
    id: 'CASE_D_TRUSTED_HEAD_MISMATCH',
    expected: { status: 'CONTRADICTED', sufficiency: 'NOT_SUFFICIENT_FOR_CLAIM' },
    evidence: {
      ...baseEvidence,
      checkpointExpectation: {
        expectedCount: null,
        expectedHeadHash: '0xaaa3',
        provenanceTrusted: true,
      },
    },
  },
  {
    id: 'CASE_E_MATCHING_EXPECTATION_BUT_UNTRUSTED_SIGNER',
    expected: { status: 'UNKNOWN', sufficiency: 'NOT_SUFFICIENT_FOR_CLAIM' },
    evidence: {
      ...baseEvidence,
      signerTrust: {
        independentlyTrusted: false,
        basis: null,
      },
      checkpointExpectation: {
        expectedCount: 3,
        expectedHeadHash: null,
        provenanceTrusted: true,
      },
    },
  },
];

const evaluated = cases.map((testCase) => {
  const result = evaluateReceiptCompletenessClaim({ claim, evidence: testCase.evidence, policy });
  const pass = result.status === testCase.expected.status && result.sufficiency === testCase.expected.sufficiency;
  return { id: testCase.id, expected: testCase.expected, pass, result };
});

const failures = evaluated.filter((row) => !row.pass);
const run = {
  schema: 'velmere.bolyra.claim-sufficiency-test-run.v0.1',
  classification: 'PRE_RELEASE_MACHINE_EVALUATED_METHODOLOGY_TEST',
  velmereSourceBinding: {
    branch: 'r11b-integration-v8-clean',
    sourceSha: VELMERE_SOURCE_SHA,
    treeSha: VELMERE_TREE_SHA,
    note: 'The prototype is developed against this exact Velmère checkpoint. Until merged, it is not part of that source SHA.',
  },
  subject: {
    provider: 'Bolyra',
    scope: 'public receipt/verifier semantics; synthetic completeness-sufficiency case',
    notClaimed: ['Bolyra audit', 'Bolyra vulnerability', 'production validation', 'certification', 'design partnership'],
  },
  testCount: evaluated.length,
  passed: evaluated.length - failures.length,
  failed: failures.length,
  allPassed: failures.length === 0,
  primaryCase: evaluated[0],
  cases: evaluated,
};

const selfPath = fileURLToPath(import.meta.url);
const defaultOut = path.join(path.dirname(selfPath), 'VELMERE_BOLYRA_ENGINE_RUN_v1.json');
const argIndex = process.argv.indexOf('--out');
const out = argIndex >= 0 && process.argv[argIndex + 1] ? path.resolve(process.argv[argIndex + 1]) : defaultOut;
fs.writeFileSync(out, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  allPassed: run.allPassed,
  testCount: run.testCount,
  passed: run.passed,
  failed: run.failed,
  primaryStatus: run.primaryCase.result.status,
  primarySufficiency: run.primaryCase.result.sufficiency,
  primaryMissingEvidence: run.primaryCase.result.missingEvidence,
  output: out,
}, null, 2));

if (!run.allPassed) process.exitCode = 1;
